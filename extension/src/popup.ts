// Popup script - handles the extension popup UI

import { match } from 'ts-pattern';

(function() { console.log(`[PDF Autofill Popup] Build: __BUILD_TIME__`); })();

interface FieldMapping {
  fieldId: string;
  fieldName: string;
  fieldType: string;
  value: string;
}

interface ProcessingState {
  status: 'idle' | 'processing' | 'ready' | 'error';
  mappings?: FieldMapping[];
  error?: string;
  tabId?: number;
}

let currentTabId: number | null = null;
const skippedFields: Set<string> = new Set();

document.addEventListener('DOMContentLoaded', async () => {
  const pdfUpload = document.getElementById('pdfUpload') as HTMLInputElement;
  const fileName = document.getElementById('fileName');
  const confirmSection = document.getElementById('confirmSection');
  const mappingsList = document.getElementById('mappingsList');
  const confirmBtn = document.getElementById('confirmBtn');
  const cancelBtn = document.getElementById('cancelBtn');
  const loading = document.getElementById('loading');
  const clearExistingCheckbox = document.getElementById('clearExisting') as HTMLInputElement;

  // Settings elements
  const settingsToggle = document.getElementById('settingsToggle');
  const settingsPanel = document.getElementById('settingsPanel');
  const apiKeyInput = document.getElementById('apiKeyInput') as HTMLInputElement;
  const toggleApiKeyVisibility = document.getElementById('toggleApiKeyVisibility');
  const saveApiKeyBtn = document.getElementById('saveApiKey');
  const clearApiKeyBtn = document.getElementById('clearApiKey');
  const apiKeyStatus = document.getElementById('apiKeyStatus');

  // Get target tab from storage (set when icon was clicked)
  const storage = await chrome.storage.local.get('targetTabId');
  currentTabId = storage.targetTabId || null;
  
  // Load saved API key status (show info if key detected on startup)
  await loadApiKeyStatus(true);
  
  // Show which page we're working with
  if (currentTabId) {
    try {
      const tab = await chrome.tabs.get(currentTabId);
      const targetInfo = document.getElementById('targetInfo');
      if (targetInfo) {
        targetInfo.textContent = `Target: ${tab.title || tab.url}`;
      }
    } catch {
      updateStatus('Target tab was closed. Please click the extension icon again on the form page.', 'error');
      return;
    }
  } else {
    updateStatus('No target tab. Please click the extension icon on a page with a form.', 'error');
    return;
  }

  // Check if there's already a processing state
  const state = await getProcessingState();
  if (state.status === 'processing') {
    showLoading(true);
    updateStatus('Processing PDF...', 'info');
    pollForCompletion();
  } else if (state.status === 'ready' && state.mappings) {
    showConfirmation(state.mappings);
    updateStatus('Review mappings below', 'success');
  } else if (state.status === 'error') {
    updateStatus(`Error: ${state.error}`, 'error');
  }

  // Listen for background messages
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    const handled = match(message.type)
      .with('PROCESSING_COMPLETE', () => {
        showLoading(false);
        showConfirmation(message.mappings);
        updateStatus('Review mappings below', 'success');
        sendResponse({ received: true });
        return true;
      })
      .with('PROCESSING_ERROR', () => {
        showLoading(false);
        updateStatus(`Error: ${message.error}`, 'error');
        sendResponse({ received: true });
        return true;
      })
      .otherwise(() => false);
    
    return handled;
  });

  // Handle PDF file selection
  pdfUpload?.addEventListener('change', async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;

    if (fileName) fileName.textContent = file.name;
    
    await startProcessing(file);
  });

  // Confirm button - fill the form
  confirmBtn?.addEventListener('click', async () => {
    const state = await getProcessingState();
    if (state.mappings && currentTabId) {
      // Filter out skipped fields
      const filteredMappings = state.mappings.filter(m => !skippedFields.has(m.fieldId));
      const clearExisting = clearExistingCheckbox?.checked ?? true;
      
      chrome.runtime.sendMessage({
        type: 'FILL_FORM_FROM_BACKGROUND',
        tabId: currentTabId,
        mappings: filteredMappings,
        clearExisting,
      });
      updateStatus('Form filled!', 'success');
      hideConfirmSection();
      skippedFields.clear();
    }
  });

  // Cancel button
  cancelBtn?.addEventListener('click', async () => {
    await chrome.runtime.sendMessage({ type: 'RESET_STATE' });
    hideConfirmSection();
    updateStatus('Cancelled', 'info');
  });

  // Settings toggle
  settingsToggle?.addEventListener('click', () => {
    settingsPanel?.classList.toggle('hidden');
  });

  // Toggle API key visibility
  toggleApiKeyVisibility?.addEventListener('click', () => {
    if (apiKeyInput) {
      apiKeyInput.type = apiKeyInput.type === 'password' ? 'text' : 'password';
    }
  });

  // Save API key
  saveApiKeyBtn?.addEventListener('click', async () => {
    const key = apiKeyInput?.value.trim();
    if (!key) {
      showApiKeyStatus('Please enter an API key', 'error');
      return;
    }
    
    // OpenAI keys can start with sk- or sk-proj- or other prefixes
    if (!key.startsWith('sk-')) {
      showApiKeyStatus('Invalid API key format. Key should start with "sk-"', 'error');
      return;
    }
    
    try {
      const response = await chrome.runtime.sendMessage({ type: 'SET_API_KEY', apiKey: key });
      console.log('SET_API_KEY response:', response);
      if (response?.success) {
        showApiKeyStatus('API key saved successfully!', 'success');
        if (apiKeyInput) apiKeyInput.value = '';
        await loadApiKeyStatus();
      } else {
        showApiKeyStatus('Failed to save API key', 'error');
      }
    } catch (err) {
      console.error('Error saving API key:', err);
      showApiKeyStatus('Failed to save API key', 'error');
    }
  });

  // Clear API key
  clearApiKeyBtn?.addEventListener('click', async () => {
    await chrome.runtime.sendMessage({ type: 'CLEAR_API_KEY' });
    showApiKeyStatus('API key cleared', 'success');
    await loadApiKeyStatus();
  });

  // Helper function to load API key status
  async function loadApiKeyStatus(showDetectedMessage = false): Promise<void> {
    try {
      const key = await chrome.runtime.sendMessage({ type: 'GET_API_KEY' });
      console.log('GET_API_KEY response:', key ? `sk-...${key.slice(-4)}` : 'null');
      if (key) {
        const maskedKey = `sk-...${key.slice(-4)}`;
        if (apiKeyInput) {
          apiKeyInput.placeholder = maskedKey;
        }
        if (showDetectedMessage) {
          showApiKeyStatus(`Using saved API key (${maskedKey})`, 'info');
        }
      } else {
        if (apiKeyInput) {
          apiKeyInput.placeholder = 'sk-...';
        }
      }
    } catch (err) {
      console.error('Error loading API key status:', err);
      if (apiKeyInput) {
        apiKeyInput.placeholder = 'sk-...';
      }
    }
  }

  // Helper function to show API key status
  function showApiKeyStatus(message: string, type: 'success' | 'error' | 'info'): void {
    if (apiKeyStatus) {
      apiKeyStatus.textContent = message;
      apiKeyStatus.className = `api-key-status ${type}`;
      setTimeout(() => {
        apiKeyStatus.textContent = '';
        apiKeyStatus.className = 'api-key-status';
      }, 3000);
    }
  }

  async function startProcessing(file: File): Promise<void> {
    showLoading(true);
    updateStatus('Processing PDF...', 'info');

    try {
      if (!currentTabId) {
        throw new Error('No active tab');
      }

      // Ensure content script is injected
      await ensureContentScriptInjected(currentTabId);

      // Extract form fields from page
      const formFields = await chrome.tabs.sendMessage(currentTabId, { type: 'GET_FORM_FIELDS' });
      
      if (!formFields || formFields.length === 0) {
        throw new Error('No form fields found on page');
      }

      // Convert PDF to base64
      const base64Pdf = await fileToBase64(file);

      // Send to background for processing (this won't block)
      chrome.runtime.sendMessage({
        type: 'PROCESS_PDF',
        pdfBase64: base64Pdf,
        formFields: formFields,
        tabId: currentTabId,
      });

      // Start polling (in case popup stays open)
      pollForCompletion();

    } catch (error) {
      console.error('Process error:', error);
      updateStatus(`Error: ${(error as Error).message}`, 'error');
      showLoading(false);
    }
  }

  function pollForCompletion(): void {
    const interval = setInterval(async () => {
      const state = await getProcessingState();
      
      if (state.status === 'ready' && state.mappings) {
        clearInterval(interval);
        showLoading(false);
        showConfirmation(state.mappings);
        updateStatus('Review mappings below', 'success');
      } else if (state.status === 'error') {
        clearInterval(interval);
        showLoading(false);
        updateStatus(`Error: ${state.error}`, 'error');
      } else if (state.status === 'idle') {
        clearInterval(interval);
        showLoading(false);
      }
    }, 500);
  }

  function showConfirmation(mappings: FieldMapping[]): void {
    if (!mappingsList || !confirmSection) return;

    mappingsList.innerHTML = '';
    skippedFields.clear();
    
    for (const mapping of mappings) {
      if (!mapping.value) continue;
      
      const item = document.createElement('div');
      item.className = 'mapping-item';
      item.dataset.fieldId = mapping.fieldId;
      item.innerHTML = `
        <div class="mapping-content">
          <span class="mapping-field">${escapeHtml(mapping.fieldName || mapping.fieldId)}</span>
          <span class="mapping-arrow">→</span>
          <span class="mapping-value">${escapeHtml(mapping.value)}</span>
        </div>
        <button class="skip-field-btn" title="Skip this field">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      `;
      
      // Add click handler for skip button
      const skipBtn = item.querySelector('.skip-field-btn');
      skipBtn?.addEventListener('click', () => {
        const fieldId = item.dataset.fieldId;
        if (fieldId) {
          if (skippedFields.has(fieldId)) {
            skippedFields.delete(fieldId);
            item.classList.remove('skipped');
          } else {
            skippedFields.add(fieldId);
            item.classList.add('skipped');
          }
        }
      });
      
      mappingsList.appendChild(item);
    }

    if (mappingsList.children.length === 0) {
      mappingsList.innerHTML = '<div class="mapping-item">No fields could be matched</div>';
    }

    confirmSection.classList.remove('hidden');
  }

  function hideConfirmSection(): void {
    confirmSection?.classList.add('hidden');
  }

  function showLoading(show: boolean): void {
    if (show) {
      loading?.classList.remove('hidden');
    } else {
      loading?.classList.add('hidden');
    }
  }
});

async function getProcessingState(): Promise<ProcessingState> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'GET_PROCESSING_STATE' }, (response) => {
      resolve(response || { status: 'idle' });
    });
  });
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (): void => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function updateStatus(message: string, type: 'success' | 'error' | 'info'): void {
  const statusElement = document.getElementById('status');
  if (statusElement) {
    statusElement.textContent = message;
    statusElement.className = `status ${type}`;
  }
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

async function ensureContentScriptInjected(tabId: number): Promise<void> {
  try {
    await chrome.tabs.sendMessage(tabId, { type: 'PING' });
  } catch {
    if (chrome.scripting?.executeScript) {
      try {
        await chrome.scripting.executeScript({
          target: { tabId },
          files: ['dist/content.js'],
        });
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (injectError) {
        console.error('Failed to inject script:', injectError);
        throw new Error('Please reload the page and try again');
      }
    } else {
      throw new Error('Please reload the page and try again');
    }
  }
}
