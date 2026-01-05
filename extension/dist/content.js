"use strict";
(() => {
  // node_modules/ts-pattern/dist/index.js
  var t = /* @__PURE__ */ Symbol.for("@ts-pattern/matcher");
  var e = /* @__PURE__ */ Symbol.for("@ts-pattern/isVariadic");
  var n = "@ts-pattern/anonymous-select-key";
  var r = (t2) => Boolean(t2 && "object" == typeof t2);
  var i = (e2) => e2 && !!e2[t];
  var o = (n2, s2, c2) => {
    if (i(n2)) {
      const e2 = n2[t](), { matched: r2, selections: i2 } = e2.match(s2);
      return r2 && i2 && Object.keys(i2).forEach((t2) => c2(t2, i2[t2])), r2;
    }
    if (r(n2)) {
      if (!r(s2)) return false;
      if (Array.isArray(n2)) {
        if (!Array.isArray(s2)) return false;
        let t2 = [], r2 = [], u = [];
        for (const o2 of n2.keys()) {
          const s3 = n2[o2];
          i(s3) && s3[e] ? u.push(s3) : u.length ? r2.push(s3) : t2.push(s3);
        }
        if (u.length) {
          if (u.length > 1) throw new Error("Pattern error: Using `...P.array(...)` several times in a single pattern is not allowed.");
          if (s2.length < t2.length + r2.length) return false;
          const e2 = s2.slice(0, t2.length), n3 = 0 === r2.length ? [] : s2.slice(-r2.length), i2 = s2.slice(t2.length, 0 === r2.length ? Infinity : -r2.length);
          return t2.every((t3, n4) => o(t3, e2[n4], c2)) && r2.every((t3, e3) => o(t3, n3[e3], c2)) && (0 === u.length || o(u[0], i2, c2));
        }
        return n2.length === s2.length && n2.every((t3, e2) => o(t3, s2[e2], c2));
      }
      return Reflect.ownKeys(n2).every((e2) => {
        const r2 = n2[e2];
        return (e2 in s2 || i(u = r2) && "optional" === u[t]().matcherType) && o(r2, s2[e2], c2);
        var u;
      });
    }
    return Object.is(s2, n2);
  };
  var s = (e2) => {
    var n2, o2, u;
    return r(e2) ? i(e2) ? null != (n2 = null == (o2 = (u = e2[t]()).getSelectionKeys) ? void 0 : o2.call(u)) ? n2 : [] : Array.isArray(e2) ? c(e2, s) : c(Object.values(e2), s) : [];
  };
  var c = (t2, e2) => t2.reduce((t3, n2) => t3.concat(e2(n2)), []);
  function a(t2) {
    return Object.assign(t2, { optional: () => h(t2), and: (e2) => d(t2, e2), or: (e2) => y(t2, e2), select: (e2) => void 0 === e2 ? v(t2) : v(e2, t2) });
  }
  function h(e2) {
    return a({ [t]: () => ({ match: (t2) => {
      let n2 = {};
      const r2 = (t3, e3) => {
        n2[t3] = e3;
      };
      return void 0 === t2 ? (s(e2).forEach((t3) => r2(t3, void 0)), { matched: true, selections: n2 }) : { matched: o(e2, t2, r2), selections: n2 };
    }, getSelectionKeys: () => s(e2), matcherType: "optional" }) });
  }
  function d(...e2) {
    return a({ [t]: () => ({ match: (t2) => {
      let n2 = {};
      const r2 = (t3, e3) => {
        n2[t3] = e3;
      };
      return { matched: e2.every((e3) => o(e3, t2, r2)), selections: n2 };
    }, getSelectionKeys: () => c(e2, s), matcherType: "and" }) });
  }
  function y(...e2) {
    return a({ [t]: () => ({ match: (t2) => {
      let n2 = {};
      const r2 = (t3, e3) => {
        n2[t3] = e3;
      };
      return c(e2, s).forEach((t3) => r2(t3, void 0)), { matched: e2.some((e3) => o(e3, t2, r2)), selections: n2 };
    }, getSelectionKeys: () => c(e2, s), matcherType: "or" }) });
  }
  function p(e2) {
    return { [t]: () => ({ match: (t2) => ({ matched: Boolean(e2(t2)) }) }) };
  }
  function v(...e2) {
    const r2 = "string" == typeof e2[0] ? e2[0] : void 0, i2 = 2 === e2.length ? e2[1] : "string" == typeof e2[0] ? void 0 : e2[0];
    return a({ [t]: () => ({ match: (t2) => {
      let e3 = { [null != r2 ? r2 : n]: t2 };
      return { matched: void 0 === i2 || o(i2, t2, (t3, n2) => {
        e3[t3] = n2;
      }), selections: e3 };
    }, getSelectionKeys: () => [null != r2 ? r2 : n].concat(void 0 === i2 ? [] : s(i2)) }) });
  }
  function b(t2) {
    return true;
  }
  function w(t2) {
    return "number" == typeof t2;
  }
  function S(t2) {
    return "string" == typeof t2;
  }
  function j(t2) {
    return "bigint" == typeof t2;
  }
  var K = a(p(b));
  var O = a(p(b));
  var x = (t2) => Object.assign(a(t2), { startsWith: (e2) => {
    return x(d(t2, (n2 = e2, p((t3) => S(t3) && t3.startsWith(n2)))));
    var n2;
  }, endsWith: (e2) => {
    return x(d(t2, (n2 = e2, p((t3) => S(t3) && t3.endsWith(n2)))));
    var n2;
  }, minLength: (e2) => x(d(t2, ((t3) => p((e3) => S(e3) && e3.length >= t3))(e2))), length: (e2) => x(d(t2, ((t3) => p((e3) => S(e3) && e3.length === t3))(e2))), maxLength: (e2) => x(d(t2, ((t3) => p((e3) => S(e3) && e3.length <= t3))(e2))), includes: (e2) => {
    return x(d(t2, (n2 = e2, p((t3) => S(t3) && t3.includes(n2)))));
    var n2;
  }, regex: (e2) => {
    return x(d(t2, (n2 = e2, p((t3) => S(t3) && Boolean(t3.match(n2))))));
    var n2;
  } });
  var A = x(p(S));
  var N = (t2) => Object.assign(a(t2), { between: (e2, n2) => N(d(t2, ((t3, e3) => p((n3) => w(n3) && t3 <= n3 && e3 >= n3))(e2, n2))), lt: (e2) => N(d(t2, ((t3) => p((e3) => w(e3) && e3 < t3))(e2))), gt: (e2) => N(d(t2, ((t3) => p((e3) => w(e3) && e3 > t3))(e2))), lte: (e2) => N(d(t2, ((t3) => p((e3) => w(e3) && e3 <= t3))(e2))), gte: (e2) => N(d(t2, ((t3) => p((e3) => w(e3) && e3 >= t3))(e2))), int: () => N(d(t2, p((t3) => w(t3) && Number.isInteger(t3)))), finite: () => N(d(t2, p((t3) => w(t3) && Number.isFinite(t3)))), positive: () => N(d(t2, p((t3) => w(t3) && t3 > 0))), negative: () => N(d(t2, p((t3) => w(t3) && t3 < 0))) });
  var P = N(p(w));
  var k = (t2) => Object.assign(a(t2), { between: (e2, n2) => k(d(t2, ((t3, e3) => p((n3) => j(n3) && t3 <= n3 && e3 >= n3))(e2, n2))), lt: (e2) => k(d(t2, ((t3) => p((e3) => j(e3) && e3 < t3))(e2))), gt: (e2) => k(d(t2, ((t3) => p((e3) => j(e3) && e3 > t3))(e2))), lte: (e2) => k(d(t2, ((t3) => p((e3) => j(e3) && e3 <= t3))(e2))), gte: (e2) => k(d(t2, ((t3) => p((e3) => j(e3) && e3 >= t3))(e2))), positive: () => k(d(t2, p((t3) => j(t3) && t3 > 0))), negative: () => k(d(t2, p((t3) => j(t3) && t3 < 0))) });
  var T = k(p(j));
  var B = a(p(function(t2) {
    return "boolean" == typeof t2;
  }));
  var _ = a(p(function(t2) {
    return "symbol" == typeof t2;
  }));
  var W = a(p(function(t2) {
    return null == t2;
  }));
  var $ = a(p(function(t2) {
    return null != t2;
  }));
  var I = class extends Error {
    constructor(t2) {
      let e2;
      try {
        e2 = JSON.stringify(t2);
      } catch (n2) {
        e2 = t2;
      }
      super(`Pattern matching error: no pattern matches value ${e2}`), this.input = void 0, this.input = t2;
    }
  };
  var L = { matched: false, value: void 0 };
  function M(t2) {
    return new R(t2, L);
  }
  var R = class _R {
    constructor(t2, e2) {
      this.input = void 0, this.state = void 0, this.input = t2, this.state = e2;
    }
    with(...t2) {
      if (this.state.matched) return this;
      const e2 = t2[t2.length - 1], r2 = [t2[0]];
      let i2;
      3 === t2.length && "function" == typeof t2[1] ? i2 = t2[1] : t2.length > 2 && r2.push(...t2.slice(1, t2.length - 1));
      let s2 = false, c2 = {};
      const u = (t3, e3) => {
        s2 = true, c2[t3] = e3;
      }, a2 = !r2.some((t3) => o(t3, this.input, u)) || i2 && !Boolean(i2(this.input)) ? L : { matched: true, value: e2(s2 ? n in c2 ? c2[n] : c2 : this.input, this.input) };
      return new _R(this.input, a2);
    }
    when(t2, e2) {
      if (this.state.matched) return this;
      const n2 = Boolean(t2(this.input));
      return new _R(this.input, n2 ? { matched: true, value: e2(this.input, this.input) } : L);
    }
    otherwise(t2) {
      return this.state.matched ? this.state.value : t2(this.input);
    }
    exhaustive(t2 = F) {
      return this.state.matched ? this.state.value : t2(this.input);
    }
    run() {
      return this.exhaustive();
    }
    returnType() {
      return this;
    }
    narrow() {
      return this;
    }
  };
  function F(t2) {
    throw new I(t2);
  }

  // src/content.ts
  (function() {
    console.log(`[PDF Autofill Content] Build: 2026-01-05T17:47:57.020Z`);
  })();
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    console.log("Content script received message:", message);
    const handled = M(message.type).with("PING", () => {
      sendResponse({ status: "ok" });
      return true;
    }).with("GET_FORM_FIELDS", () => {
      const fields = extractFormFields();
      sendResponse(fields);
      return true;
    }).with("FILL_FORM", () => {
      fillForm(message.data, message.clearExisting ?? true);
      sendResponse({ success: true });
      return true;
    }).otherwise(() => false);
    return handled;
  });
  function extractFormFields() {
    const fields = [];
    const inputs = document.querySelectorAll("input, select, textarea");
    const processedRadioGroups = /* @__PURE__ */ new Set();
    const processedSearchables = /* @__PURE__ */ new Set();
    inputs.forEach((element, index) => {
      const el = element;
      if (el instanceof HTMLInputElement) {
        if (["hidden", "submit", "button", "reset", "image"].includes(el.type)) {
          return;
        }
        if (el.type === "radio") {
          const groupName = el.name;
          if (processedRadioGroups.has(groupName)) {
            return;
          }
          processedRadioGroups.add(groupName);
          const radioOptions = document.querySelectorAll(`input[type="radio"][name="${groupName}"]`);
          const options2 = [];
          radioOptions.forEach((radio) => {
            const radioEl = radio;
            const radioLabel = document.querySelector(`label[for="${radioEl.id}"]`);
            const optionText = radioLabel?.textContent?.trim() || radioEl.value;
            options2.push(optionText);
          });
          let groupLabel = "";
          const firstRadio = radioOptions[0];
          const fieldset = firstRadio?.closest("fieldset");
          if (fieldset) {
            const legend = fieldset.querySelector("legend");
            groupLabel = legend?.textContent?.trim() || "";
          }
          if (!groupLabel) {
            const prevLabel = firstRadio?.parentElement?.previousElementSibling;
            if (prevLabel?.tagName === "LABEL") {
              groupLabel = prevLabel.textContent?.trim() || "";
            }
          }
          fields.push({
            id: groupName,
            name: groupName,
            type: "radio",
            label: groupLabel || groupName,
            placeholder: `Options: ${options2.join(", ")}`,
            selector: `[name="${groupName}"]`,
            options: options2
          });
          return;
        }
      }
      const id = el.id || `field_${index}`;
      const name = el.name || "";
      const type = el instanceof HTMLInputElement ? el.type : el.tagName.toLowerCase();
      let label = "";
      if (el.id) {
        const labelEl = document.querySelector(`label[for="${el.id}"]`);
        if (labelEl) {
          label = labelEl.textContent?.trim() || "";
        }
      }
      if (!label) {
        const parentLabel = el.closest("label");
        if (parentLabel) {
          label = parentLabel.textContent?.trim() || "";
        }
      }
      const placeholder = "placeholder" in el ? el.placeholder || "" : "";
      let selector = "";
      if (el.id) {
        selector = `#${el.id}`;
      } else if (el.name) {
        selector = `[name="${el.name}"]`;
      } else {
        selector = `${el.tagName.toLowerCase()}:nth-of-type(${index + 1})`;
      }
      let options;
      if (el instanceof HTMLSelectElement) {
        options = Array.from(el.options).filter((opt) => opt.value).map((opt) => opt.textContent?.trim() || opt.value);
      }
      if (el instanceof HTMLInputElement && el.type === "text") {
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
        options
      });
    });
    extractStandaloneSearchableFields(fields, processedSearchables);
    console.log("Extracted form fields:", fields);
    return fields;
  }
  function extractSearchableOptions(input, fieldId) {
    const options = [];
    const wrapper = input.closest('.searchable-select, .multi-select, [class*="select"], [class*="dropdown"]');
    const dropdownSelectors = [
      `#${fieldId}Dropdown`,
      `#${fieldId.replace("Search", "")}Dropdown`,
      ".dropdown",
      '[class*="dropdown"]',
      '[role="listbox"]',
      'ul[class*="options"]'
    ];
    let dropdown = null;
    for (const sel of dropdownSelectors) {
      dropdown = wrapper?.querySelector(sel) || document.querySelector(`#${fieldId}Dropdown`);
      if (dropdown) break;
    }
    if (dropdown) {
      const items = dropdown.querySelectorAll('.dropdown-item, [role="option"], li, [class*="option"]');
      items.forEach((item) => {
        const text = item.textContent?.trim();
        if (text && !options.includes(text)) {
          options.push(text);
        }
      });
    }
    return options;
  }
  function extractStandaloneSearchableFields(fields, processed) {
    const hiddenInputs = document.querySelectorAll('input[type="hidden"]');
    hiddenInputs.forEach((hidden) => {
      const hiddenEl = hidden;
      const id = hiddenEl.id || hiddenEl.name;
      if (!id || processed.has(id)) return;
      const searchInput = document.getElementById(`${id.replace("Value", "")}Search`) || document.querySelector(`input[name="${id.replace("Value", "")}Search"]`);
      if (searchInput) {
        processed.add(id);
        const wrapper = hiddenEl.closest('.searchable-select, .multi-select, [class*="select"]');
        const options = [];
        if (wrapper) {
          const dropdown = wrapper.querySelector('.dropdown, [class*="dropdown"]');
          if (dropdown) {
            const items = dropdown.querySelectorAll('.dropdown-item, [role="option"], li');
            items.forEach((item) => {
              const text = item.textContent?.trim();
              if (text && !options.includes(text)) {
                options.push(text);
              }
            });
          }
        }
        let label = "";
        const labelEl = document.querySelector(`label[for="${searchInput.id}"]`);
        if (labelEl) {
          label = labelEl.textContent?.trim() || "";
        }
        const existingIndex = fields.findIndex((f) => f.id === id.replace("Value", "") || f.id === searchInput.id);
        if (existingIndex >= 0) {
          fields[existingIndex].options = options;
          fields[existingIndex].type = "searchable-select";
        } else {
          fields.push({
            id: id.replace("Value", ""),
            name: id.replace("Value", ""),
            type: "searchable-select",
            label,
            placeholder: "",
            selector: `#${searchInput.id}`,
            options
          });
        }
      }
    });
  }
  function fillForm(data, clearExisting = true) {
    console.log("Filling form with data:", data, "clearExisting:", clearExisting);
    const searchableFields = [];
    const regularFields = [];
    const pendingFields = [];
    for (const [fieldId, value] of Object.entries(data)) {
      if (!value) continue;
      const isSearchable = document.getElementById(`${fieldId}SelectWrapper`) || document.getElementById(`${fieldId}Search`) || fieldId.endsWith("Search");
      if (isSearchable) {
        searchableFields.push([fieldId, value]);
      } else {
        regularFields.push([fieldId, value]);
      }
    }
    console.log(`[FillForm] Searchable fields: ${searchableFields.map((f) => f[0]).join(", ")}`);
    console.log(`[FillForm] Regular fields: ${regularFields.map((f) => f[0]).join(", ")}`);
    const filledFields = /* @__PURE__ */ new Set();
    for (const [fieldId, value] of searchableFields) {
      const filled = fillSingleField(fieldId, value, clearExisting);
      if (filled) {
        filledFields.add(fieldId);
      } else {
        pendingFields.push([fieldId, value]);
      }
    }
    setTimeout(() => {
      for (const [fieldId, value] of regularFields) {
        const filled = fillSingleField(fieldId, value, clearExisting);
        if (filled) {
          filledFields.add(fieldId);
        } else {
          pendingFields.push([fieldId, value]);
        }
      }
      if (pendingFields.length > 0) {
        setTimeout(() => {
          console.log("[FillForm] Attempting to fill conditional fields:", pendingFields.map((f) => f[0]));
          for (const [fieldId, value] of pendingFields) {
            if (!filledFields.has(fieldId)) {
              const filled = fillSingleField(fieldId, value, clearExisting);
              if (filled) {
                filledFields.add(fieldId);
              }
            }
          }
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
  function isPartOfSearchableSelect(el, fieldId) {
    const wrapper = el.closest('.searchable-select, .multi-select, [class*="select-wrapper"]');
    if (wrapper) return true;
    const baseId = fieldId.replace("Search", "");
    const hiddenInput = document.getElementById(`${baseId}Value`) || document.querySelector(`input[type="hidden"][name="${baseId}"]`);
    if (hiddenInput) return true;
    const dropdown = document.getElementById(`${baseId}Dropdown`) || document.getElementById(`${fieldId}Dropdown`);
    if (dropdown) return true;
    const selectWrapper = document.getElementById(`${baseId}SelectWrapper`);
    if (selectWrapper) return true;
    return false;
  }
  function fillSingleField(fieldId, value, clearExisting) {
    let element = null;
    element = document.getElementById(fieldId);
    if (!element) {
      element = document.querySelector(`[name="${fieldId}"]`);
    }
    if (!element) {
      try {
        element = document.querySelector(fieldId);
      } catch {
      }
    }
    if (element) {
      const style = window.getComputedStyle(element);
      const isHidden = style.display === "none" || style.visibility === "hidden" || element.disabled;
      if (isHidden) {
        console.log(`Field ${fieldId} is hidden or disabled, skipping for now`);
        return false;
      }
    }
    if (element && (element instanceof HTMLInputElement || element instanceof HTMLSelectElement || element instanceof HTMLTextAreaElement)) {
      const el = element;
      if (el instanceof HTMLSelectElement) {
        return fillSelectField(el, value, clearExisting);
      } else if (el instanceof HTMLInputElement && el.type === "radio") {
        return fillRadioField(el, value);
      } else if (el instanceof HTMLInputElement && el.type === "checkbox") {
        return fillCheckboxField(el, value);
      } else if (el instanceof HTMLInputElement && el.type === "text") {
        const isSearchInput = isPartOfSearchableSelect(el, fieldId);
        if (isSearchInput) {
          console.log(`[FillSingleField] ${fieldId} is part of searchable select, using tryFillSearchableSelect`);
          return tryFillSearchableSelect(fieldId.replace("Search", ""), value);
        }
        return fillTextField(el, value, clearExisting);
      } else {
        return fillTextField(el, value, clearExisting);
      }
    } else {
      const filled = tryFillSearchableSelect(fieldId, value);
      if (filled) return true;
      const filledMulti = tryFillMultiSelect(fieldId, value);
      if (filledMulti) return true;
      console.warn(`Could not find element for field: ${fieldId}`);
      return false;
    }
  }
  function fillSelectField(el, value, clearExisting) {
    if (clearExisting) {
      el.selectedIndex = 0;
    }
    const options = Array.from(el.options);
    const match = options.find(
      (opt) => opt.value.toLowerCase() === value.toLowerCase() || opt.textContent?.toLowerCase() === value.toLowerCase() || opt.textContent?.toLowerCase().includes(value.toLowerCase())
    );
    if (match) {
      el.value = match.value;
      triggerFullEventSequence(el);
      console.log(`Filled select ${el.id || el.name} with: ${match.value}`);
      return true;
    }
    return false;
  }
  function fillRadioField(el, value) {
    const radioGroup = document.querySelectorAll(`input[type="radio"][name="${el.name}"]`);
    let matched = false;
    radioGroup.forEach((radio) => {
      const radioEl = radio;
      if (radioEl.value.toLowerCase() === value.toLowerCase()) {
        radioEl.checked = true;
        triggerFullEventSequence(radioEl);
        matched = true;
        console.log(`Selected radio ${el.name} = ${radioEl.value}`);
      }
    });
    if (!matched) {
      radioGroup.forEach((radio) => {
        const radioEl = radio;
        const label = document.querySelector(`label[for="${radioEl.id}"]`);
        const labelText = label?.textContent?.toLowerCase() || "";
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
  function fillCheckboxField(el, value) {
    const shouldCheck = value.toLowerCase() === "true" || value.toLowerCase() === "yes" || value === "1";
    el.checked = shouldCheck;
    triggerFullEventSequence(el);
    console.log(`Set checkbox ${el.id || el.name} to: ${shouldCheck}`);
    return true;
  }
  function fillTextField(el, value, clearExisting) {
    el.focus();
    if (clearExisting) {
      el.value = "";
      if (el instanceof HTMLInputElement && (el.type === "date" || el.type === "datetime-local")) {
        el.valueAsDate = null;
      }
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    }
    el.value = value;
    triggerFullEventSequence(el);
    if (el instanceof HTMLInputElement && el.type === "date") {
      const dateMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (dateMatch) {
        try {
          el.valueAsDate = /* @__PURE__ */ new Date(value + "T00:00:00");
        } catch {
        }
      }
    }
    el.blur();
    console.log(`Filled ${el.id || el.name} with: ${value}`);
    return true;
  }
  function triggerFullEventSequence(el) {
    el.dispatchEvent(new FocusEvent("focus", { bubbles: true }));
    el.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    el.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true }));
    el.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true }));
    el.dispatchEvent(new FocusEvent("blur", { bubbles: true }));
    el.dispatchEvent(new FocusEvent("focusout", { bubbles: true }));
  }
  function tryFillSearchableSelect(fieldId, value) {
    const wrapperPatterns = [
      `#${fieldId}SelectWrapper`,
      `#${fieldId}Wrapper`,
      `[data-field="${fieldId}"]`,
      `.select2-container[data-field="${fieldId}"]`,
      `#select2-${fieldId}-container`
    ];
    let wrapper = null;
    for (const pattern of wrapperPatterns) {
      try {
        wrapper = document.querySelector(pattern);
        if (wrapper) break;
      } catch {
        continue;
      }
    }
    const searchInput = document.getElementById(`${fieldId}Search`) || document.querySelector(`input[name="${fieldId}Search"]`) || wrapper?.querySelector('input[type="text"]');
    if (!searchInput || !(searchInput instanceof HTMLInputElement)) {
      return false;
    }
    const isMultiSelect = wrapper?.classList.contains("multi-select") || wrapper?.querySelector(".selected-items") !== null || wrapper?.querySelector('[class*="multi"]') !== null;
    const values = value.includes(",") || isMultiSelect ? value.split(",").map((v2) => v2.trim()).filter((v2) => v2) : [value];
    console.log(`[SearchableSelect] Found search input for ${fieldId}, attempting to select ${values.length} value(s): "${values.join('", "')}"`);
    processSearchableValuesSequentially(fieldId, values, searchInput, wrapper, 0);
    return true;
  }
  function processSearchableValuesSequentially(fieldId, values, searchInput, wrapper, index) {
    if (index >= values.length) {
      searchInput.blur();
      return;
    }
    const isMultiSelect = wrapper?.classList.contains("multi-select") || wrapper?.querySelector(".selected-items") !== null || wrapper?.querySelector('[class*="multi"]') !== null;
    const hasMoreValues = index < values.length - 1;
    const value = values[index];
    console.log(`[SearchableSelect] Selecting value ${index + 1}/${values.length}: "${value}" for ${fieldId} (multi: ${isMultiSelect})`);
    searchInput.focus();
    wrapper?.classList.add("open");
    if (index > 0 || isMultiSelect) {
      searchInput.value = "";
      searchInput.dispatchEvent(new Event("input", { bubbles: true }));
    }
    setTimeout(() => {
      searchInput.value = value;
      searchInput.dispatchEvent(new Event("input", { bubbles: true }));
      setTimeout(() => {
        const dropdown = wrapper?.querySelector(".dropdown") || document.getElementById(`${fieldId}Dropdown`) || document.querySelector(`[id*="${fieldId}"][class*="dropdown"]`);
        let clicked = false;
        if (dropdown) {
          const items = dropdown.querySelectorAll('.dropdown-item:not(.hidden):not(.selected), [role="option"]:not(.hidden):not([aria-selected="true"]), li:not(.hidden):not(.selected)');
          let matchToClick = null;
          let isExactMatch = false;
          console.log(`[SearchableSelect] Found ${items.length} dropdown items for ${fieldId}`);
          items.forEach((item) => {
            const itemEl = item;
            const itemText = itemEl.textContent?.trim().toLowerCase() || "";
            const valueLower = value.toLowerCase();
            if (itemText === valueLower) {
              matchToClick = itemEl;
              isExactMatch = true;
            } else if (!isExactMatch && !matchToClick && (itemText.includes(valueLower) || valueLower.includes(itemText))) {
              matchToClick = itemEl;
            }
          });
          if (matchToClick !== null) {
            const elementToClick = matchToClick;
            console.log(`[SearchableSelect] Clicking option: "${elementToClick.textContent?.trim()}" for ${fieldId}`);
            elementToClick.scrollIntoView({ block: "nearest" });
            setTimeout(() => {
              elementToClick.click();
              console.log(`[SearchableSelect] Click dispatched for "${elementToClick.textContent?.trim()}" for ${fieldId}`);
              setTimeout(() => {
                if (isMultiSelect && hasMoreValues) {
                  searchInput.value = "";
                  searchInput.dispatchEvent(new Event("input", { bubbles: true }));
                  setTimeout(() => {
                    processSearchableValuesSequentially(fieldId, values, searchInput, wrapper, index + 1);
                  }, 150);
                } else if (hasMoreValues) {
                  processSearchableValuesSequentially(fieldId, values, searchInput, wrapper, index + 1);
                } else {
                  searchInput.blur();
                  wrapper?.classList.remove("open");
                }
              }, 300);
            }, 50);
            clicked = true;
          } else {
            console.log(
              `[SearchableSelect] No match found for "${value}" in ${fieldId}, available options:`,
              Array.from(items).map((i2) => i2.textContent?.trim())
            );
          }
        } else {
          console.log(`[SearchableSelect] No dropdown found for ${fieldId}`);
        }
        if (!clicked) {
          setTimeout(() => {
            processSearchableValuesSequentially(fieldId, values, searchInput, wrapper, index + 1);
          }, 100);
        }
      }, 150);
    }, 100);
  }
  function tryFillMultiSelect(fieldId, value) {
    const wrapper = document.getElementById(`${fieldId}SelectWrapper`) || document.querySelector(`[data-field="${fieldId}"]`);
    if (!wrapper) return false;
    console.log(`[MultiSelect] Found wrapper for ${fieldId}, attempting to add "${value}"`);
    const values = value.split(",").map((v2) => v2.trim());
    wrapper.classList.add("open");
    values.forEach((val, index) => {
      setTimeout(() => {
        const searchInput = wrapper.querySelector('input[type="text"]');
        if (searchInput && searchInput instanceof HTMLInputElement) {
          searchInput.focus();
          searchInput.value = val;
          searchInput.dispatchEvent(new Event("input", { bubbles: true }));
          setTimeout(() => {
            const dropdown = wrapper.querySelector(".dropdown");
            if (dropdown) {
              const items = dropdown.querySelectorAll(".dropdown-item:not(.hidden):not(.selected)");
              let clicked = false;
              items.forEach((item) => {
                if (clicked) return;
                const itemText = item.textContent?.trim().toLowerCase() || "";
                if (itemText === val.toLowerCase()) {
                  console.log(`[MultiSelect] Clicking option: "${item.textContent?.trim()}"`);
                  item.click();
                  clicked = true;
                }
              });
              if (!clicked) {
                console.log(`[MultiSelect] No match found for "${val}"`);
              }
            }
          }, 100);
        }
      }, index * 200);
    });
    return true;
  }
  function init() {
    console.log("PDF Autofill content script initialized");
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
