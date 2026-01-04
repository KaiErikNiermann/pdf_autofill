// Background service worker for the Chrome extension

import { match } from 'ts-pattern';

(function() { console.log(`[PDF Autofill Background] Build: __BUILD_TIME__`); })();

const API_BASE_URL = 'http://localhost:8000';

// Store processing state
interface ProcessingState {
  status: 'idle' | 'processing' | 'ready' | 'error';
  mappings?: FieldMapping[];
  error?: string;
  tabId?: number;
}

interface FieldMapping {
  fieldId: string;
  fieldName: string;
  fieldType: string;
  value: string;
}

let processingState: ProcessingState = { status: 'idle' };

// API Key storage helpers
async function getStoredApiKey(): Promise<string | null> {
  const result = await chrome.storage.local.get('openai_api_key');
  const key = result.openai_api_key || null;
  console.log('getStoredApiKey:', key ? `sk-...${key.slice(-4)}` : 'null');
  return key;
}

async function setStoredApiKey(key: string): Promise<void> {
  console.log('setStoredApiKey:', key ? `sk-...${key.slice(-4)}` : 'null');
  await chrome.storage.local.set({ openai_api_key: key });
  // Verify it was saved
  const verify = await chrome.storage.local.get('openai_api_key');
  console.log('Verified saved key:', verify.openai_api_key ? `sk-...${verify.openai_api_key.slice(-4)}` : 'null');
}

async function clearStoredApiKey(): Promise<void> {
  console.log('clearStoredApiKey called');
  await chrome.storage.local.remove('openai_api_key');
}

// Listen for messages from content scripts or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background received message:', message);

  return match(message.type)
    .with('API_REQUEST', () => {
      handleApiRequest(message.endpoint, message.method, message.data)
        .then(sendResponse)
        .catch((error: Error) => sendResponse({ error: error.message }));
      return true;
    })
    .with('PROCESS_PDF', () => {
      processPdf(message.pdfBase64, message.formFields, message.tabId);
      sendResponse({ started: true });
      return true;
    })
    .with('GET_PROCESSING_STATE', () => {
      sendResponse(processingState);
      return true;
    })
    .with('FILL_FORM_FROM_BACKGROUND', () => {
      fillFormFromBackground(message.tabId, message.mappings, message.clearExisting ?? true);
      sendResponse({ started: true });
      return true;
    })
    .with('RESET_STATE', () => {
      processingState = { status: 'idle' };
      sendResponse({ ok: true });
      return true;
    })
    .with('GET_API_KEY', () => {
      getStoredApiKey().then(sendResponse);
      return true;
    })
    .with('SET_API_KEY', () => {
      setStoredApiKey(message.apiKey).then(() => sendResponse({ success: true }));
      return true;
    })
    .with('CLEAR_API_KEY', () => {
      clearStoredApiKey().then(() => sendResponse({ success: true }));
      return true;
    })
    .otherwise(() => false);
});

// Process PDF in background
async function processPdf(pdfBase64: string, formFields: unknown[], tabId: number): Promise<void> {
  processingState = { status: 'processing', tabId };

  try {
    // Get stored API key
    const apiKey = await getStoredApiKey();
    
    const requestBody: Record<string, unknown> = {
      pdf_base64: pdfBase64,
      form_fields: formFields,
    };
    
    // Include API key if available
    if (apiKey) {
      requestBody.openai_api_key = apiKey;
      console.log('Sending request with API key:', `sk-...${apiKey.slice(-4)}`);
    } else {
      console.log('No API key found, sending request without key');
    }

    const response = await fetch(`${API_BASE_URL}/api/process-pdf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const error = await response.json();

      throw new Error(
        match(response.status)
          .with(401, () => 'Invalid or missing API key. Please check your OpenAI API key in Settings.')
          .with(429, () => 'Rate limit exceeded. Please wait a moment and try again.')
          .with(503, () => 'Unable to connect to OpenAI. Please check your internet connection.')
          .otherwise(() => error.detail || 'Server error')
      )
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Processing failed');
    }

    processingState = { status: 'ready', mappings: result.mappings, tabId };
    
    // Notify any open popup
    chrome.runtime.sendMessage({ type: 'PROCESSING_COMPLETE', mappings: result.mappings }).catch(() => {});
    
  } catch (error) {
    processingState = { status: 'error', error: (error as Error).message, tabId };
    chrome.runtime.sendMessage({ type: 'PROCESSING_ERROR', error: (error as Error).message }).catch(() => {});
  }
}

// Fill form from background
async function fillFormFromBackground(tabId: number, mappings: FieldMapping[], clearExisting: boolean): Promise<void> {
  const fillData: Record<string, string> = {};
  for (const mapping of mappings) {
    fillData[mapping.fieldId] = mapping.value;
  }

  try {
    await chrome.tabs.sendMessage(tabId, { type: 'FILL_FORM', data: fillData, clearExisting });
    processingState = { status: 'idle' };
  } catch (error) {
    console.error('Failed to fill form:', error);
  }
}

// Handle API requests to the Python backend
async function handleApiRequest(
  endpoint: string,
  method: string = 'GET',
  data?: unknown
): Promise<unknown> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (data && method !== 'GET') {
    options.body = JSON.stringify(data);
  }

  const response = await fetch(url, options);
  
  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

// Handle extension icon click - open popup in new tab
chrome.action.onClicked.addListener(async (tab) => {
  // Store the tab ID we want to work with
  if (tab.id) {
    await chrome.storage.local.set({ targetTabId: tab.id });
  }
  
  // Open popup.html in a new tab
  chrome.tabs.create({
    url: chrome.runtime.getURL('popup.html'),
  });
});

// Extension installed/updated handler
chrome.runtime.onInstalled.addListener((details) => {
  console.log('Extension installed:', details.reason);
  
  if (details.reason === 'install') {
    // Initialize default settings
    chrome.storage.local.set({
      settings: {
        apiUrl: API_BASE_URL,
        enabled: true,
      },
    });
  }
});
