// Popup script - handles the extension popup UI

import { match } from 'ts-pattern';

(function() { console.log(`[PDF Autofill Popup] Build: __BUILD_TIME__`); })();

// Supported file types
const SUPPORTED_MIME_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/gif',
  'image/bmp',
  'image/tiff',
];

const SUPPORTED_EXTENSIONS = ['.pdf', '.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp', '.tiff'];

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

// OCR Mode type
type OCRMode = 'tesseract' | 'deepdoctection';

function isValidFile(file: File): boolean {
  // Check MIME type
  if (SUPPORTED_MIME_TYPES.includes(file.type)) {
    return true;
  }
  // Check extension as fallback
  const ext = '.' + file.name.split('.').pop()?.toLowerCase();
  return SUPPORTED_EXTENSIONS.includes(ext);
}

function getFileDisplayName(file: File): string {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  const isImage = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'tiff'].includes(ext);
  const icon = isImage ? '🖼️' : '📄';
  return `${icon} ${file.name}`;
}

document.addEventListener('DOMContentLoaded', async () => {
  const pdfUpload = document.getElementById('pdfUpload') as HTMLInputElement;
  const dropZone = document.getElementById('dropZone') as HTMLElement;
  const fileName = document.getElementById('fileName');
  const confirmSection = document.getElementById('confirmSection');
  const mappingsList = document.getElementById('mappingsList');
  const confirmBtn = document.getElementById('confirmBtn');
  const cancelBtn = document.getElementById('cancelBtn');
  const loading = document.getElementById('loading');
  const clearExistingCheckbox = document.getElementById('clearExisting') as HTMLInputElement;

  // OCR Mode elements
  const ocrFastRadio = document.getElementById('ocrFast') as HTMLInputElement;
  const ocrAccurateRadio = document.getElementById('ocrAccurate') as HTMLInputElement;
  const ocrModeHint = document.getElementById('ocrModeHint');

  // Settings elements
  const settingsToggle = document.getElementById('settingsToggle');
  const settingsPanel = document.getElementById('settingsPanel');
  const apiKeyInput = document.getElementById('apiKeyInput') as HTMLInputElement;
  const toggleApiKeyVisibility = document.getElementById('toggleApiKeyVisibility');
  const saveApiKeyBtn = document.getElementById('saveApiKey');
  const clearApiKeyBtn = document.getElementById('clearApiKey');
  const apiKeyStatus = document.getElementById('apiKeyStatus');

  // Get target tab from storage (set when icon was clicked)
  const storage = await chrome.storage.local.get(['targetTabId', 'ocrMode']);
  currentTabId = storage.targetTabId || null;
  
  // Load saved OCR mode preference
  const savedOcrMode = storage.ocrMode as OCRMode | undefined;
  if (savedOcrMode === 'deepdoctection' && ocrAccurateRadio) {
    ocrAccurateRadio.checked = true;
    updateOcrModeHint('deepdoctection');
  }
  
  // Check OCR capabilities from backend
  await checkOcrCapabilities();
  
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
  
  // OCR mode change handlers
  ocrFastRadio?.addEventListener('change', () => {
    if (ocrFastRadio.checked) {
      saveOcrMode('tesseract');
      updateOcrModeHint('tesseract');
    }
  });
  
  ocrAccurateRadio?.addEventListener('change', () => {
    if (ocrAccurateRadio.checked) {
      saveOcrMode('deepdoctection');
      updateOcrModeHint('deepdoctection');
    }
  });
  
  function updateOcrModeHint(mode: OCRMode) {
    if (!ocrModeHint) return;
    if (mode === 'tesseract') {
      ocrModeHint.textContent = 'Tesseract: Quick scan, good for clean documents';
    } else {
      ocrModeHint.textContent = 'deepdoctection: Structure-preserving, better for complex layouts';
    }
  }
  
  async function saveOcrMode(mode: OCRMode) {
    await chrome.storage.local.set({ ocrMode: mode });
  }
  
  async function checkOcrCapabilities() {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_OCR_CAPABILITIES' });
      if (response && !response.deepdoctection_available) {
        // Disable the accurate option if deepdoctection is not available
        if (ocrAccurateRadio) {
          ocrAccurateRadio.disabled = true;
          const label = ocrAccurateRadio.nextElementSibling as HTMLElement;
          if (label) {
            label.classList.add('disabled');
            label.title = 'deepdoctection not installed on server';
          }
        }
        // Force tesseract if deepdoctection was selected but not available
        if (ocrAccurateRadio?.checked) {
          ocrFastRadio.checked = true;
          saveOcrMode('tesseract');
          updateOcrModeHint('tesseract');
        }
      }
    } catch {
      // Server not available, ignore
    }
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

    if (!isValidFile(file)) {
      updateStatus('Unsupported file type. Use PDF or image.', 'error');
      return;
    }

    if (fileName) fileName.textContent = getFileDisplayName(file);
    
    await startProcessing(file);
  });

  // Drag and drop handlers
  dropZone?.addEventListener('dragenter', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.add('drag-over');
  });

  dropZone?.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.add('drag-over');
  });

  dropZone?.addEventListener('dragleave', (e) => {
    e.preventDefault();
    e.stopPropagation();
    // Only remove if we're leaving the drop zone entirely
    const rect = dropZone.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    if (x < rect.left || x >= rect.right || y < rect.top || y >= rect.bottom) {
      dropZone.classList.remove('drag-over');
    }
  });

  dropZone?.addEventListener('drop', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.remove('drag-over');

    const files = e.dataTransfer?.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    if (!isValidFile(file)) {
      updateStatus('Unsupported file type. Use PDF or image.', 'error');
      return;
    }

    if (fileName) fileName.textContent = getFileDisplayName(file);
    await startProcessing(file);
  });

  // Click on drop zone to trigger file input
  dropZone?.addEventListener('click', (e) => {
    // Don't trigger if clicking the file input itself
    if (e.target === pdfUpload) return;
    pdfUpload?.click();
  });

  // Keyboard support for drop zone
  dropZone?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      pdfUpload?.click();
    }
  });

  // Paste handler (works globally in popup)
  document.addEventListener('paste', async (e) => {
    const clipboardData = e.clipboardData;
    if (!clipboardData) return;

    // Check for files in clipboard
    const files = clipboardData.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (!isValidFile(file)) {
        updateStatus('Unsupported file type. Use PDF or image.', 'error');
        return;
      }
      e.preventDefault();
      if (fileName) fileName.textContent = getFileDisplayName(file);
      await startProcessing(file);
      return;
    }

    // Check for image data in clipboard items
    const items = clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          const displayName = `🖼️ Pasted image (${item.type.split('/')[1]})`;
          if (fileName) fileName.textContent = displayName;
          await startProcessing(file);
          return;
        }
      }
    }
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
    const fileType = file.type.startsWith('image/') ? 'image' : 'file';
    updateStatus(`Processing ${fileType}...`, 'info');

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

      // Convert file to base64
      const base64Data = await fileToBase64(file);
      
      // Get selected OCR mode
      const ocrMode = ocrAccurateRadio?.checked ? 'deepdoctection' : 'tesseract';

      // Send to background for processing (this won't block)
      chrome.runtime.sendMessage({
        type: 'PROCESS_PDF',
        pdfBase64: base64Data,
        mimeType: file.type || undefined,
        formFields: formFields,
        tabId: currentTabId,
        ocrMode: ocrMode,
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
