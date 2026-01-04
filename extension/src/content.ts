// Content script - runs in the context of web pages

import { match } from 'ts-pattern';

(function() { console.log(`[PDF Autofill Content] Build: __BUILD_TIME__`); })();

interface FormFieldInfo {
  id: string;
  name: string;
  type: string;
  label: string;
  placeholder: string;
  selector: string;
  options?: string[];  // Available options for select/radio/searchable fields
}

// Listen for messages from the popup or background
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  console.log('Content script received message:', message);

  const handled = match(message.type)
    .with('PING', () => {
      sendResponse({ status: 'ok' });
      return true;
    })
    .with('GET_FORM_FIELDS', () => {
      const fields = extractFormFields();
      sendResponse(fields);
      return true;
    })
    .with('FILL_FORM', () => {
      fillForm(message.data, message.clearExisting ?? true);
      sendResponse({ success: true });
      return true;
    })
    .otherwise(() => false);

  return handled;
});

// Extract all form fields from the page
function extractFormFields(): FormFieldInfo[] {
  const fields: FormFieldInfo[] = [];
  const inputs = document.querySelectorAll('input, select, textarea');
  const processedRadioGroups = new Set<string>();
  const processedSearchables = new Set<string>();

  inputs.forEach((element, index) => {
    const el = element as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
    
    // Skip hidden, submit, button types
    if (el instanceof HTMLInputElement) {
      if (['hidden', 'submit', 'button', 'reset', 'image'].includes(el.type)) {
        return;
      }
      
      // For radio buttons, group them by name
      if (el.type === 'radio') {
        const groupName = el.name;
        if (processedRadioGroups.has(groupName)) {
          return; // Already processed this radio group
        }
        processedRadioGroups.add(groupName);
        
        // Get all options for this radio group
        const radioOptions = document.querySelectorAll(`input[type="radio"][name="${groupName}"]`);
        const options: string[] = [];
        
        radioOptions.forEach((radio) => {
          const radioEl = radio as HTMLInputElement;
          const radioLabel = document.querySelector(`label[for="${radioEl.id}"]`);
          const optionText = radioLabel?.textContent?.trim() || radioEl.value;
          options.push(optionText);
        });
        
        // Find a common label (look for preceding text or fieldset legend)
        let groupLabel = '';
        const firstRadio = radioOptions[0] as HTMLInputElement;
        const fieldset = firstRadio?.closest('fieldset');
        if (fieldset) {
          const legend = fieldset.querySelector('legend');
          groupLabel = legend?.textContent?.trim() || '';
        }
        
        // Try to find a label before the radio group
        if (!groupLabel) {
          const prevLabel = firstRadio?.parentElement?.previousElementSibling;
          if (prevLabel?.tagName === 'LABEL') {
            groupLabel = prevLabel.textContent?.trim() || '';
          }
        }
        
        fields.push({
          id: groupName,
          name: groupName,
          type: 'radio',
          label: groupLabel || groupName,
          placeholder: `Options: ${options.join(', ')}`,
          selector: `[name="${groupName}"]`,
          options,
        });
        return;
      }
    }

    const id = el.id || `field_${index}`;
    const name = el.name || '';
    const type = el instanceof HTMLInputElement ? el.type : el.tagName.toLowerCase();
    
    // Try to find associated label
    let label = '';
    if (el.id) {
      const labelEl = document.querySelector(`label[for="${el.id}"]`);
      if (labelEl) {
        label = labelEl.textContent?.trim() || '';
      }
    }
    
    // Try parent label
    if (!label) {
      const parentLabel = el.closest('label');
      if (parentLabel) {
        label = parentLabel.textContent?.trim() || '';
      }
    }

    // Use placeholder as fallback (only for input/textarea)
    const placeholder = 'placeholder' in el ? el.placeholder || '' : '';

    // Build a unique selector
    let selector = '';
    if (el.id) {
      selector = `#${el.id}`;
    } else if (el.name) {
      selector = `[name="${el.name}"]`;
    } else {
      selector = `${el.tagName.toLowerCase()}:nth-of-type(${index + 1})`;
    }

    // Extract options for select elements
    let options: string[] | undefined;
    if (el instanceof HTMLSelectElement) {
      options = Array.from(el.options)
        .filter(opt => opt.value) // Skip empty/placeholder options
        .map(opt => opt.textContent?.trim() || opt.value);
    }
    
    // Check if this input has a searchable dropdown wrapper
    if (el instanceof HTMLInputElement && el.type === 'text') {
      const searchableOptions = extractSearchableOptions(el, id);
      if (searchableOptions.length > 0) {
        options = searchableOptions;
      }
    }

    fields.push({
      id,
      name: name || id,
      type,
      label,
      placeholder,
      selector,
      options,
    });
  });
  
  // Also scan for standalone searchable selects (hidden inputs with associated dropdowns)
  extractStandaloneSearchableFields(fields, processedSearchables);

  console.log('Extracted form fields:', fields);
  return fields;
}

// Extract options from searchable select dropdowns
function extractSearchableOptions(input: HTMLInputElement, fieldId: string): string[] {
  const options: string[] = [];
  
  // Look for common wrapper patterns
  const wrapper = input.closest('.searchable-select, .multi-select, [class*="select"], [class*="dropdown"]');
  
  // Try to find dropdown by various patterns
  const dropdownSelectors = [
    `#${fieldId}Dropdown`,
    `#${fieldId.replace('Search', '')}Dropdown`,
    '.dropdown',
    '[class*="dropdown"]',
    '[role="listbox"]',
    'ul[class*="options"]',
  ];
  
  let dropdown: Element | null = null;
  for (const sel of dropdownSelectors) {
    dropdown = wrapper?.querySelector(sel) || document.querySelector(`#${fieldId}Dropdown`);
    if (dropdown) break;
  }
  
  if (dropdown) {
    const items = dropdown.querySelectorAll('.dropdown-item, [role="option"], li, [class*="option"]');
    items.forEach(item => {
      const text = (item as HTMLElement).textContent?.trim();
      if (text && !options.includes(text)) {
        options.push(text);
      }
    });
  }
  
  return options;
}

// Extract standalone searchable fields (hidden inputs with visible search inputs)
function extractStandaloneSearchableFields(fields: FormFieldInfo[], processed: Set<string>): void {
  // Find hidden inputs that might be for searchable selects
  const hiddenInputs = document.querySelectorAll('input[type="hidden"]');
  
  hiddenInputs.forEach(hidden => {
    const hiddenEl = hidden as HTMLInputElement;
    const id = hiddenEl.id || hiddenEl.name;
    if (!id || processed.has(id)) return;
    
    // Check if there's a corresponding search input
    const searchInput = document.getElementById(`${id.replace('Value', '')}Search`) ||
                        document.querySelector(`input[name="${id.replace('Value', '')}Search"]`);
    
    if (searchInput) {
      processed.add(id);
      
      // Find the wrapper and extract options
      const wrapper = hiddenEl.closest('.searchable-select, .multi-select, [class*="select"]');
      const options: string[] = [];
      
      if (wrapper) {
        const dropdown = wrapper.querySelector('.dropdown, [class*="dropdown"]');
        if (dropdown) {
          const items = dropdown.querySelectorAll('.dropdown-item, [role="option"], li');
          items.forEach(item => {
            const text = (item as HTMLElement).textContent?.trim();
            if (text && !options.includes(text)) {
              options.push(text);
            }
          });
        }
      }
      
      // Find label
      let label = '';
      const labelEl = document.querySelector(`label[for="${searchInput.id}"]`);
      if (labelEl) {
        label = labelEl.textContent?.trim() || '';
      }
      
      // Check if field already exists
      const existingIndex = fields.findIndex(f => f.id === id.replace('Value', '') || f.id === (searchInput as HTMLInputElement).id);
      if (existingIndex >= 0) {
        // Update existing field with options
        fields[existingIndex].options = options;
        fields[existingIndex].type = 'searchable-select';
      } else {
        fields.push({
          id: id.replace('Value', ''),
          name: id.replace('Value', ''),
          type: 'searchable-select',
          label,
          placeholder: '',
          selector: `#${(searchInput as HTMLInputElement).id}`,
          options,
        });
      }
    }
  });
}

// Fill form fields with provided data
function fillForm(data: Record<string, string>, clearExisting: boolean = true): void {
  console.log('Filling form with data:', data, 'clearExisting:', clearExisting);
  
  // Separate fields that might trigger conditionals (searchable selects) from regular fields
  const searchableFields: Array<[string, string]> = [];
  const regularFields: Array<[string, string]> = [];
  const pendingFields: Array<[string, string]> = [];
  
  for (const [fieldId, value] of Object.entries(data)) {
    if (!value) continue;
    
    // Check if this is likely a searchable select (has *Search suffix or *SelectWrapper exists)
    const isSearchable = document.getElementById(`${fieldId}SelectWrapper`) ||
                         document.getElementById(`${fieldId}Search`) ||
                         fieldId.endsWith('Search');
    
    if (isSearchable) {
      searchableFields.push([fieldId, value]);
    } else {
      regularFields.push([fieldId, value]);
    }
  }
  
  console.log(`[FillForm] Searchable fields: ${searchableFields.map(f => f[0]).join(', ')}`);
  console.log(`[FillForm] Regular fields: ${regularFields.map(f => f[0]).join(', ')}`);
  
  // First: Fill searchable selects (these trigger conditionals)
  const filledFields = new Set<string>();
  for (const [fieldId, value] of searchableFields) {
    const filled = fillSingleField(fieldId, value, clearExisting);
    if (filled) {
      filledFields.add(fieldId);
    } else {
      pendingFields.push([fieldId, value]);
    }
  }
  
  // Second: Fill regular fields (after a delay to let searchables complete)
  setTimeout(() => {
    for (const [fieldId, value] of regularFields) {
      const filled = fillSingleField(fieldId, value, clearExisting);
      if (filled) {
        filledFields.add(fieldId);
      } else {
        pendingFields.push([fieldId, value]);
      }
    }
    
    // Third pass: try conditional fields after DOM updates
    if (pendingFields.length > 0) {
      setTimeout(() => {
        console.log('[FillForm] Attempting to fill conditional fields:', pendingFields.map(f => f[0]));
        for (const [fieldId, value] of pendingFields) {
          if (!filledFields.has(fieldId)) {
            const filled = fillSingleField(fieldId, value, clearExisting);
            if (filled) {
              filledFields.add(fieldId);
            }
          }
        }
        
        // Fourth pass for deeply nested conditionals
        setTimeout(() => {
          for (const [fieldId, value] of pendingFields) {
            if (!filledFields.has(fieldId)) {
              fillSingleField(fieldId, value, clearExisting);
            }
          }
        }, 500);
      }, 500);
    }
  }, 300);
}

// Check if a text input is part of a searchable select component
function isPartOfSearchableSelect(el: HTMLInputElement, fieldId: string): boolean {
  // Check for common wrapper patterns
  const wrapper = el.closest('.searchable-select, .multi-select, [class*="select-wrapper"]');
  if (wrapper) return true;
  
  // Check if there's a hidden input for this field (pattern: countrySearch -> countryValue)
  const baseId = fieldId.replace('Search', '');
  const hiddenInput = document.getElementById(`${baseId}Value`) || 
                      document.querySelector(`input[type="hidden"][name="${baseId}"]`);
  if (hiddenInput) return true;
  
  // Check if there's a dropdown associated with this field
  const dropdown = document.getElementById(`${baseId}Dropdown`) ||
                   document.getElementById(`${fieldId}Dropdown`);
  if (dropdown) return true;
  
  // Check if wrapper exists
  const selectWrapper = document.getElementById(`${baseId}SelectWrapper`);
  if (selectWrapper) return true;
  
  return false;
}

// Fill a single field with proper event handling
function fillSingleField(fieldId: string, value: string, clearExisting: boolean): boolean {
  // Try multiple ways to find the element
  let element: HTMLElement | null = null;
  
  // Try by ID
  element = document.getElementById(fieldId);
  
  // Try by name
  if (!element) {
    element = document.querySelector(`[name="${fieldId}"]`);
  }
  
  // Try by selector directly
  if (!element) {
    try {
      element = document.querySelector(fieldId);
    } catch {
      // Invalid selector, skip
    }
  }
  
  // Check if element is visible/enabled
  if (element) {
    const style = window.getComputedStyle(element);
    const isHidden = style.display === 'none' || style.visibility === 'hidden' || 
                     (element as HTMLInputElement).disabled;
    if (isHidden) {
      console.log(`Field ${fieldId} is hidden or disabled, skipping for now`);
      return false;
    }
  }

  if (element && (element instanceof HTMLInputElement || element instanceof HTMLSelectElement || element instanceof HTMLTextAreaElement)) {
    const el = element;
    
    if (el instanceof HTMLSelectElement) {
      return fillSelectField(el, value, clearExisting);
    } else if (el instanceof HTMLInputElement && el.type === 'radio') {
      return fillRadioField(el, value);
    } else if (el instanceof HTMLInputElement && el.type === 'checkbox') {
      return fillCheckboxField(el, value);
    } else if (el instanceof HTMLInputElement && el.type === 'text') {
      // Check if this text input is part of a searchable select
      const isSearchInput = isPartOfSearchableSelect(el, fieldId);
      if (isSearchInput) {
        console.log(`[FillSingleField] ${fieldId} is part of searchable select, using tryFillSearchableSelect`);
        return tryFillSearchableSelect(fieldId.replace('Search', ''), value);
      }
      return fillTextField(el, value, clearExisting);
    } else {
      return fillTextField(el, value, clearExisting);
    }
  } else {
    // Try to find searchable select wrapper
    const filled = tryFillSearchableSelect(fieldId, value);
    if (filled) return true;
    
    // Try to find multi-select wrapper
    const filledMulti = tryFillMultiSelect(fieldId, value);
    if (filledMulti) return true;
    
    console.warn(`Could not find element for field: ${fieldId}`);
    return false;
  }
}

// Fill a standard select element
function fillSelectField(el: HTMLSelectElement, value: string, clearExisting: boolean): boolean {
  if (clearExisting) {
    el.selectedIndex = 0;
  }
  
  const options = Array.from(el.options);
  const match = options.find(opt => 
    opt.value.toLowerCase() === value.toLowerCase() ||
    opt.textContent?.toLowerCase() === value.toLowerCase() ||
    opt.textContent?.toLowerCase().includes(value.toLowerCase())
  );
  
  if (match) {
    el.value = match.value;
    triggerFullEventSequence(el);
    console.log(`Filled select ${el.id || el.name} with: ${match.value}`);
    return true;
  }
  return false;
}

// Fill radio button group
function fillRadioField(el: HTMLInputElement, value: string): boolean {
  const radioGroup = document.querySelectorAll(`input[type="radio"][name="${el.name}"]`);
  let matched = false;
  
  radioGroup.forEach((radio) => {
    const radioEl = radio as HTMLInputElement;
    if (radioEl.value.toLowerCase() === value.toLowerCase()) {
      radioEl.checked = true;
      triggerFullEventSequence(radioEl);
      matched = true;
      console.log(`Selected radio ${el.name} = ${radioEl.value}`);
    }
  });
  
  if (!matched) {
    radioGroup.forEach((radio) => {
      const radioEl = radio as HTMLInputElement;
      const label = document.querySelector(`label[for="${radioEl.id}"]`);
      const labelText = label?.textContent?.toLowerCase() || '';
      
      if (labelText.includes(value.toLowerCase()) || value.toLowerCase().includes(labelText)) {
        radioEl.checked = true;
        triggerFullEventSequence(radioEl);
        matched = true;
        console.log(`Selected radio ${el.name} = ${radioEl.value} (matched by label)`);
      }
    });
  }
  
  return matched;
}

// Fill checkbox
function fillCheckboxField(el: HTMLInputElement, value: string): boolean {
  const shouldCheck = value.toLowerCase() === 'true' || value.toLowerCase() === 'yes' || value === '1';
  el.checked = shouldCheck;
  triggerFullEventSequence(el);
  console.log(`Set checkbox ${el.id || el.name} to: ${shouldCheck}`);
  return true;
}

// Fill text/date/number inputs with proper event sequence
function fillTextField(el: HTMLInputElement | HTMLTextAreaElement, value: string, clearExisting: boolean): boolean {
  // Focus first to trigger any focus handlers
  el.focus();
  
  if (clearExisting) {
    el.value = '';
    if (el instanceof HTMLInputElement && (el.type === 'date' || el.type === 'datetime-local')) {
      el.valueAsDate = null;
    }
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }
  
  // Set the value
  el.value = value;
  
  // Trigger comprehensive event sequence for date and other fields
  triggerFullEventSequence(el);
  
  // For date fields, also try setting valueAsDate if the format matches
  if (el instanceof HTMLInputElement && el.type === 'date') {
    const dateMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (dateMatch) {
      try {
        el.valueAsDate = new Date(value + 'T00:00:00');
      } catch {
        // Value was already set as string
      }
    }
  }
  
  // Blur to trigger validation
  el.blur();
  
  console.log(`Filled ${el.id || el.name} with: ${value}`);
  return true;
}

// Trigger a full sequence of events to ensure field registration
function triggerFullEventSequence(el: HTMLElement): void {
  // Focus event
  el.dispatchEvent(new FocusEvent('focus', { bubbles: true }));
  el.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
  
  // Input event (for live validation)
  el.dispatchEvent(new Event('input', { bubbles: true }));
  
  // Change event (for form frameworks)
  el.dispatchEvent(new Event('change', { bubbles: true }));
  
  // Keyboard events (some frameworks listen for these)
  el.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true }));
  el.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
  
  // Blur events (triggers validation)
  el.dispatchEvent(new FocusEvent('blur', { bubbles: true }));
  el.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
}

// Try to fill a searchable/autocomplete select field
function tryFillSearchableSelect(fieldId: string, value: string): boolean {
  // Look for common searchable select patterns
  const wrapperPatterns = [
    `#${fieldId}SelectWrapper`,
    `#${fieldId}Wrapper`,
    `[data-field="${fieldId}"]`,
    `.select2-container[data-field="${fieldId}"]`,
    `#select2-${fieldId}-container`,
  ];
  
  let wrapper: HTMLElement | null = null;
  for (const pattern of wrapperPatterns) {
    try {
      wrapper = document.querySelector(pattern);
      if (wrapper) break;
    } catch {
      continue;
    }
  }
  
  // Try to find search input associated with this field
  const searchInput = document.getElementById(`${fieldId}Search`) || 
                      document.querySelector(`input[name="${fieldId}Search"]`) ||
                      wrapper?.querySelector('input[type="text"]');
  
  if (!searchInput || !(searchInput instanceof HTMLInputElement)) {
    return false;
  }
  
  console.log(`[SearchableSelect] Found search input for ${fieldId}, attempting to select "${value}"`);
  
  // Step 1: Focus to open the dropdown
  searchInput.focus();
  wrapper?.classList.add('open');
  
  // Step 2: Clear and set value
  searchInput.value = '';
  searchInput.dispatchEvent(new Event('input', { bubbles: true }));
  
  // Small delay to let dropdown open
  setTimeout(() => {
    // Step 3: Type the value to filter
    searchInput.value = value;
    searchInput.dispatchEvent(new Event('input', { bubbles: true }));
    searchInput.dispatchEvent(new Event('change', { bubbles: true }));
    
    // Step 4: Find and click the dropdown
    setTimeout(() => {
      const dropdown = wrapper?.querySelector('.dropdown') || 
                       document.getElementById(`${fieldId}Dropdown`) ||
                       document.querySelector(`[id*="${fieldId}"][class*="dropdown"]`);
      
      if (dropdown) {
        const items = dropdown.querySelectorAll('.dropdown-item:not(.hidden), [role="option"]:not(.hidden), li:not(.hidden)');
        let matchToClick: HTMLElement | null = null;
        let isExactMatch = false;
        
        console.log(`[SearchableSelect] Found ${items.length} dropdown items for ${fieldId}`);
        
        items.forEach((item) => {
          const itemEl = item as HTMLElement;
          const itemText = itemEl.textContent?.trim().toLowerCase() || '';
          const valueLower = value.toLowerCase();
          
          // Exact match takes priority
          if (itemText === valueLower) {
            matchToClick = itemEl;
            isExactMatch = true;
          }
          // Partial match (item contains value or value contains item)
          else if (!isExactMatch && !matchToClick && (itemText.includes(valueLower) || valueLower.includes(itemText))) {
            matchToClick = itemEl;
          }
        });
        
        if (matchToClick) {
          console.log(`[SearchableSelect] Clicking option: "${matchToClick.textContent?.trim()}" for ${fieldId}`);
          // Simulate real click
          matchToClick.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
          matchToClick.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
          matchToClick.click();
        } else {
          console.log(`[SearchableSelect] No match found for ${fieldId}, available options:`, 
            Array.from(items).map(i => (i as HTMLElement).textContent?.trim()));
        }
      } else {
        console.log(`[SearchableSelect] No dropdown found for ${fieldId}`);
      }
    }, 150);
  }, 50);
  
  return true;
}

// Try to fill a multi-select field
function tryFillMultiSelect(fieldId: string, value: string): boolean {
  const wrapper = document.getElementById(`${fieldId}SelectWrapper`) ||
                  document.querySelector(`[data-field="${fieldId}"]`);
  
  if (!wrapper) return false;
  
  console.log(`[MultiSelect] Found wrapper for ${fieldId}, attempting to add "${value}"`);
  
  // Value might be comma-separated
  const values = value.split(',').map(v => v.trim());
  
  // Add class to open dropdown
  wrapper.classList.add('open');
  
  // Process each value with delays
  values.forEach((val, index) => {
    setTimeout(() => {
      const searchInput = wrapper.querySelector('input[type="text"]');
      if (searchInput && searchInput instanceof HTMLInputElement) {
        // Focus and type
        searchInput.focus();
        searchInput.value = val;
        searchInput.dispatchEvent(new Event('input', { bubbles: true }));
        
        // Wait for dropdown to filter, then click
        setTimeout(() => {
          const dropdown = wrapper.querySelector('.dropdown');
          if (dropdown) {
            const items = dropdown.querySelectorAll('.dropdown-item:not(.hidden):not(.selected)');
            let clicked = false;
            
            items.forEach((item) => {
              if (clicked) return;
              const itemText = (item as HTMLElement).textContent?.trim().toLowerCase() || '';
              if (itemText === val.toLowerCase()) {
                console.log(`[MultiSelect] Clicking option: "${(item as HTMLElement).textContent?.trim()}"`);
                (item as HTMLElement).click();
                clicked = true;
              }
            });
            
            if (!clicked) {
              console.log(`[MultiSelect] No match found for "${val}"`);
            }
          }
        }, 100);
      }
    }, index * 200); // Stagger each value
  });
  
  return true;
}

// Initialize
function init(): void {
  console.log('PDF Autofill content script initialized');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
