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

  // src/popup.ts
  (function() {
    console.log(`[PDF Autofill Popup] Build: 2026-01-05T16:12:40.216Z`);
  })();
  var SUPPORTED_MIME_TYPES = [
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/webp",
    "image/gif",
    "image/bmp",
    "image/tiff"
  ];
  var SUPPORTED_EXTENSIONS = [".pdf", ".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp", ".tiff"];
  var currentTabId = null;
  var skippedFields = /* @__PURE__ */ new Set();
  function isValidFile(file) {
    if (SUPPORTED_MIME_TYPES.includes(file.type)) {
      return true;
    }
    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    return SUPPORTED_EXTENSIONS.includes(ext);
  }
  function getFileDisplayName(file) {
    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    const isImage = ["png", "jpg", "jpeg", "webp", "gif", "bmp", "tiff"].includes(ext);
    const icon = isImage ? "\u{1F5BC}\uFE0F" : "\u{1F4C4}";
    return `${icon} ${file.name}`;
  }
  document.addEventListener("DOMContentLoaded", async () => {
    const pdfUpload = document.getElementById("pdfUpload");
    const dropZone = document.getElementById("dropZone");
    const fileName = document.getElementById("fileName");
    const confirmSection = document.getElementById("confirmSection");
    const mappingsList = document.getElementById("mappingsList");
    const confirmBtn = document.getElementById("confirmBtn");
    const cancelBtn = document.getElementById("cancelBtn");
    const loading = document.getElementById("loading");
    const clearExistingCheckbox = document.getElementById("clearExisting");
    const ocrFastRadio = document.getElementById("ocrFast");
    const ocrAccurateRadio = document.getElementById("ocrAccurate");
    const ocrModeHint = document.getElementById("ocrModeHint");
    const settingsToggle = document.getElementById("settingsToggle");
    const settingsPanel = document.getElementById("settingsPanel");
    const apiKeyInput = document.getElementById("apiKeyInput");
    const toggleApiKeyVisibility = document.getElementById("toggleApiKeyVisibility");
    const saveApiKeyBtn = document.getElementById("saveApiKey");
    const clearApiKeyBtn = document.getElementById("clearApiKey");
    const apiKeyStatus = document.getElementById("apiKeyStatus");
    const storage = await chrome.storage.local.get(["targetTabId", "ocrMode"]);
    currentTabId = storage.targetTabId || null;
    const savedOcrMode = storage.ocrMode;
    if (savedOcrMode === "deepdoctection" && ocrAccurateRadio) {
      ocrAccurateRadio.checked = true;
      updateOcrModeHint("deepdoctection");
    }
    await checkOcrCapabilities();
    await loadApiKeyStatus(true);
    if (currentTabId) {
      try {
        const tab = await chrome.tabs.get(currentTabId);
        const targetInfo = document.getElementById("targetInfo");
        if (targetInfo) {
          targetInfo.textContent = `Target: ${tab.title || tab.url}`;
        }
      } catch {
        updateStatus("Target tab was closed. Please click the extension icon again on the form page.", "error");
        return;
      }
    } else {
      updateStatus("No target tab. Please click the extension icon on a page with a form.", "error");
      return;
    }
    const state = await getProcessingState();
    if (state.status === "processing") {
      showLoading(true);
      updateStatus("Processing PDF...", "info");
      pollForCompletion();
    } else if (state.status === "ready" && state.mappings) {
      showConfirmation(state.mappings);
      updateStatus("Review mappings below", "success");
    } else if (state.status === "error") {
      updateStatus(`Error: ${state.error}`, "error");
    }
    ocrFastRadio?.addEventListener("change", () => {
      if (ocrFastRadio.checked) {
        saveOcrMode("tesseract");
        updateOcrModeHint("tesseract");
      }
    });
    ocrAccurateRadio?.addEventListener("change", () => {
      if (ocrAccurateRadio.checked) {
        saveOcrMode("deepdoctection");
        updateOcrModeHint("deepdoctection");
      }
    });
    function updateOcrModeHint(mode) {
      if (!ocrModeHint) return;
      if (mode === "tesseract") {
        ocrModeHint.textContent = "Tesseract: Quick scan, good for clean documents";
      } else {
        ocrModeHint.textContent = "deepdoctection: Structure-preserving, better for complex layouts";
      }
    }
    async function saveOcrMode(mode) {
      await chrome.storage.local.set({ ocrMode: mode });
    }
    async function checkOcrCapabilities() {
      try {
        const response = await chrome.runtime.sendMessage({ type: "GET_OCR_CAPABILITIES" });
        if (response && !response.deepdoctection_available) {
          if (ocrAccurateRadio) {
            ocrAccurateRadio.disabled = true;
            const label = ocrAccurateRadio.nextElementSibling;
            if (label) {
              label.classList.add("disabled");
              label.title = "deepdoctection not installed on server";
            }
          }
          if (ocrAccurateRadio?.checked) {
            ocrFastRadio.checked = true;
            saveOcrMode("tesseract");
            updateOcrModeHint("tesseract");
          }
        }
      } catch {
      }
    }
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      const handled = M(message.type).with("PROCESSING_COMPLETE", () => {
        showLoading(false);
        showConfirmation(message.mappings);
        updateStatus("Review mappings below", "success");
        sendResponse({ received: true });
        return true;
      }).with("PROCESSING_ERROR", () => {
        showLoading(false);
        updateStatus(`Error: ${message.error}`, "error");
        sendResponse({ received: true });
        return true;
      }).otherwise(() => false);
      return handled;
    });
    pdfUpload?.addEventListener("change", async (e2) => {
      const file = e2.target.files?.[0];
      if (!file) return;
      if (!isValidFile(file)) {
        updateStatus("Unsupported file type. Use PDF or image.", "error");
        return;
      }
      if (fileName) fileName.textContent = getFileDisplayName(file);
      await startProcessing(file);
    });
    dropZone?.addEventListener("dragenter", (e2) => {
      e2.preventDefault();
      e2.stopPropagation();
      dropZone.classList.add("drag-over");
    });
    dropZone?.addEventListener("dragover", (e2) => {
      e2.preventDefault();
      e2.stopPropagation();
      dropZone.classList.add("drag-over");
    });
    dropZone?.addEventListener("dragleave", (e2) => {
      e2.preventDefault();
      e2.stopPropagation();
      const rect = dropZone.getBoundingClientRect();
      const x2 = e2.clientX;
      const y2 = e2.clientY;
      if (x2 < rect.left || x2 >= rect.right || y2 < rect.top || y2 >= rect.bottom) {
        dropZone.classList.remove("drag-over");
      }
    });
    dropZone?.addEventListener("drop", async (e2) => {
      e2.preventDefault();
      e2.stopPropagation();
      dropZone.classList.remove("drag-over");
      const files = e2.dataTransfer?.files;
      if (!files || files.length === 0) return;
      const file = files[0];
      if (!isValidFile(file)) {
        updateStatus("Unsupported file type. Use PDF or image.", "error");
        return;
      }
      if (fileName) fileName.textContent = getFileDisplayName(file);
      await startProcessing(file);
    });
    dropZone?.addEventListener("click", (e2) => {
      if (e2.target === pdfUpload) return;
      pdfUpload?.click();
    });
    dropZone?.addEventListener("keydown", (e2) => {
      if (e2.key === "Enter" || e2.key === " ") {
        e2.preventDefault();
        pdfUpload?.click();
      }
    });
    document.addEventListener("paste", async (e2) => {
      const clipboardData = e2.clipboardData;
      if (!clipboardData) return;
      const files = clipboardData.files;
      if (files && files.length > 0) {
        const file = files[0];
        if (!isValidFile(file)) {
          updateStatus("Unsupported file type. Use PDF or image.", "error");
          return;
        }
        e2.preventDefault();
        if (fileName) fileName.textContent = getFileDisplayName(file);
        await startProcessing(file);
        return;
      }
      const items = clipboardData.items;
      for (let i2 = 0; i2 < items.length; i2++) {
        const item = items[i2];
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) {
            e2.preventDefault();
            const displayName = `\u{1F5BC}\uFE0F Pasted image (${item.type.split("/")[1]})`;
            if (fileName) fileName.textContent = displayName;
            await startProcessing(file);
            return;
          }
        }
      }
    });
    confirmBtn?.addEventListener("click", async () => {
      const state2 = await getProcessingState();
      if (state2.mappings && currentTabId) {
        const filteredMappings = state2.mappings.filter((m) => !skippedFields.has(m.fieldId));
        const clearExisting = clearExistingCheckbox?.checked ?? true;
        chrome.runtime.sendMessage({
          type: "FILL_FORM_FROM_BACKGROUND",
          tabId: currentTabId,
          mappings: filteredMappings,
          clearExisting
        });
        updateStatus("Form filled!", "success");
        hideConfirmSection();
        skippedFields.clear();
      }
    });
    cancelBtn?.addEventListener("click", async () => {
      await chrome.runtime.sendMessage({ type: "RESET_STATE" });
      hideConfirmSection();
      updateStatus("Cancelled", "info");
    });
    settingsToggle?.addEventListener("click", () => {
      settingsPanel?.classList.toggle("hidden");
    });
    toggleApiKeyVisibility?.addEventListener("click", () => {
      if (apiKeyInput) {
        apiKeyInput.type = apiKeyInput.type === "password" ? "text" : "password";
      }
    });
    saveApiKeyBtn?.addEventListener("click", async () => {
      const key = apiKeyInput?.value.trim();
      if (!key) {
        showApiKeyStatus("Please enter an API key", "error");
        return;
      }
      if (!key.startsWith("sk-")) {
        showApiKeyStatus('Invalid API key format. Key should start with "sk-"', "error");
        return;
      }
      try {
        const response = await chrome.runtime.sendMessage({ type: "SET_API_KEY", apiKey: key });
        console.log("SET_API_KEY response:", response);
        if (response?.success) {
          showApiKeyStatus("API key saved successfully!", "success");
          if (apiKeyInput) apiKeyInput.value = "";
          await loadApiKeyStatus();
        } else {
          showApiKeyStatus("Failed to save API key", "error");
        }
      } catch (err) {
        console.error("Error saving API key:", err);
        showApiKeyStatus("Failed to save API key", "error");
      }
    });
    clearApiKeyBtn?.addEventListener("click", async () => {
      await chrome.runtime.sendMessage({ type: "CLEAR_API_KEY" });
      showApiKeyStatus("API key cleared", "success");
      await loadApiKeyStatus();
    });
    async function loadApiKeyStatus(showDetectedMessage = false) {
      try {
        const key = await chrome.runtime.sendMessage({ type: "GET_API_KEY" });
        console.log("GET_API_KEY response:", key ? `sk-...${key.slice(-4)}` : "null");
        if (key) {
          const maskedKey = `sk-...${key.slice(-4)}`;
          if (apiKeyInput) {
            apiKeyInput.placeholder = maskedKey;
          }
          if (showDetectedMessage) {
            showApiKeyStatus(`Using saved API key (${maskedKey})`, "info");
          }
        } else {
          if (apiKeyInput) {
            apiKeyInput.placeholder = "sk-...";
          }
        }
      } catch (err) {
        console.error("Error loading API key status:", err);
        if (apiKeyInput) {
          apiKeyInput.placeholder = "sk-...";
        }
      }
    }
    function showApiKeyStatus(message, type) {
      if (apiKeyStatus) {
        apiKeyStatus.textContent = message;
        apiKeyStatus.className = `api-key-status ${type}`;
        setTimeout(() => {
          apiKeyStatus.textContent = "";
          apiKeyStatus.className = "api-key-status";
        }, 3e3);
      }
    }
    async function startProcessing(file) {
      showLoading(true);
      const fileType = file.type.startsWith("image/") ? "image" : "file";
      updateStatus(`Processing ${fileType}...`, "info");
      try {
        if (!currentTabId) {
          throw new Error("No active tab");
        }
        await ensureContentScriptInjected(currentTabId);
        const formFields = await chrome.tabs.sendMessage(currentTabId, { type: "GET_FORM_FIELDS" });
        if (!formFields || formFields.length === 0) {
          throw new Error("No form fields found on page");
        }
        const base64Data = await fileToBase64(file);
        const ocrMode = ocrAccurateRadio?.checked ? "deepdoctection" : "tesseract";
        chrome.runtime.sendMessage({
          type: "PROCESS_PDF",
          pdfBase64: base64Data,
          mimeType: file.type || void 0,
          formFields,
          tabId: currentTabId,
          ocrMode
        });
        pollForCompletion();
      } catch (error) {
        console.error("Process error:", error);
        updateStatus(`Error: ${error.message}`, "error");
        showLoading(false);
      }
    }
    function pollForCompletion() {
      const interval = setInterval(async () => {
        const state2 = await getProcessingState();
        if (state2.status === "ready" && state2.mappings) {
          clearInterval(interval);
          showLoading(false);
          showConfirmation(state2.mappings);
          updateStatus("Review mappings below", "success");
        } else if (state2.status === "error") {
          clearInterval(interval);
          showLoading(false);
          updateStatus(`Error: ${state2.error}`, "error");
        } else if (state2.status === "idle") {
          clearInterval(interval);
          showLoading(false);
        }
      }, 500);
    }
    function showConfirmation(mappings) {
      if (!mappingsList || !confirmSection) return;
      mappingsList.innerHTML = "";
      skippedFields.clear();
      for (const mapping of mappings) {
        if (!mapping.value) continue;
        const item = document.createElement("div");
        item.className = "mapping-item";
        item.dataset.fieldId = mapping.fieldId;
        item.innerHTML = `
        <div class="mapping-content">
          <span class="mapping-field">${escapeHtml(mapping.fieldName || mapping.fieldId)}</span>
          <span class="mapping-arrow">\u2192</span>
          <span class="mapping-value">${escapeHtml(mapping.value)}</span>
        </div>
        <button class="skip-field-btn" title="Skip this field">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      `;
        const skipBtn = item.querySelector(".skip-field-btn");
        skipBtn?.addEventListener("click", () => {
          const fieldId = item.dataset.fieldId;
          if (fieldId) {
            if (skippedFields.has(fieldId)) {
              skippedFields.delete(fieldId);
              item.classList.remove("skipped");
            } else {
              skippedFields.add(fieldId);
              item.classList.add("skipped");
            }
          }
        });
        mappingsList.appendChild(item);
      }
      if (mappingsList.children.length === 0) {
        mappingsList.innerHTML = '<div class="mapping-item">No fields could be matched</div>';
      }
      confirmSection.classList.remove("hidden");
    }
    function hideConfirmSection() {
      confirmSection?.classList.add("hidden");
    }
    function showLoading(show) {
      if (show) {
        loading?.classList.remove("hidden");
      } else {
        loading?.classList.add("hidden");
      }
    }
  });
  async function getProcessingState() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: "GET_PROCESSING_STATE" }, (response) => {
        resolve(response || { status: "idle" });
      });
    });
  }
  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result;
        const base64 = result.split(",")[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
  function updateStatus(message, type) {
    const statusElement = document.getElementById("status");
    if (statusElement) {
      statusElement.textContent = message;
      statusElement.className = `status ${type}`;
    }
  }
  function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }
  async function ensureContentScriptInjected(tabId) {
    try {
      await chrome.tabs.sendMessage(tabId, { type: "PING" });
    } catch {
      if (chrome.scripting?.executeScript) {
        try {
          await chrome.scripting.executeScript({
            target: { tabId },
            files: ["dist/content.js"]
          });
          await new Promise((resolve) => setTimeout(resolve, 100));
        } catch (injectError) {
          console.error("Failed to inject script:", injectError);
          throw new Error("Please reload the page and try again");
        }
      } else {
        throw new Error("Please reload the page and try again");
      }
    }
  }
})();
