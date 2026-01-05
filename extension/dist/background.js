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

  // src/background.ts
  (function() {
    console.log(`[PDF Autofill Background] Build: 2026-01-05T17:47:57.020Z`);
  })();
  var API_BASE_URL = "http://localhost:8000";
  var processingState = { status: "idle" };
  async function getStoredApiKey() {
    const result = await chrome.storage.local.get("openai_api_key");
    const key = result.openai_api_key || null;
    console.log("getStoredApiKey:", key ? `sk-...${key.slice(-4)}` : "null");
    return key;
  }
  async function setStoredApiKey(key) {
    console.log("setStoredApiKey:", key ? `sk-...${key.slice(-4)}` : "null");
    await chrome.storage.local.set({ openai_api_key: key });
    const verify = await chrome.storage.local.get("openai_api_key");
    console.log("Verified saved key:", verify.openai_api_key ? `sk-...${verify.openai_api_key.slice(-4)}` : "null");
  }
  async function clearStoredApiKey() {
    console.log("clearStoredApiKey called");
    await chrome.storage.local.remove("openai_api_key");
  }
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("Background received message:", message);
    return M(message.type).with("API_REQUEST", () => {
      handleApiRequest(message.endpoint, message.method, message.data).then(sendResponse).catch((error) => sendResponse({ error: error.message }));
      return true;
    }).with("PROCESS_PDF", () => {
      processPdf(
        message.pdfBase64,
        message.formFields,
        message.tabId,
        message.ocrMode || "tesseract",
        message.mimeType,
        message.files
      );
      sendResponse({ started: true });
      return true;
    }).with("GET_PROCESSING_STATE", () => {
      sendResponse(processingState);
      return true;
    }).with("FILL_FORM_FROM_BACKGROUND", () => {
      fillFormFromBackground(message.tabId, message.mappings, message.clearExisting ?? true);
      sendResponse({ started: true });
      return true;
    }).with("RESET_STATE", () => {
      processingState = { status: "idle" };
      sendResponse({ ok: true });
      return true;
    }).with("GET_API_KEY", () => {
      getStoredApiKey().then(sendResponse);
      return true;
    }).with("SET_API_KEY", () => {
      setStoredApiKey(message.apiKey).then(() => sendResponse({ success: true }));
      return true;
    }).with("CLEAR_API_KEY", () => {
      clearStoredApiKey().then(() => sendResponse({ success: true }));
      return true;
    }).with("GET_OCR_CAPABILITIES", () => {
      getOcrCapabilities().then(sendResponse);
      return true;
    }).otherwise(() => false);
  });
  async function getOcrCapabilities() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/ocr-capabilities`);
      if (response.ok) {
        return await response.json();
      }
    } catch {
    }
    return null;
  }
  async function processPdf(fileBase64, formFields, tabId, ocrMode = "tesseract", mimeType, files) {
    processingState = { status: "processing", tabId };
    try {
      const apiKey = await getStoredApiKey();
      const requestBody = {
        form_fields: formFields,
        ocr_mode: ocrMode
      };
      if (files && files.length > 0) {
        requestBody.files = files;
        console.log(`Processing ${files.length} file(s) with OCR mode:`, ocrMode);
      } else if (fileBase64) {
        requestBody.file_base64 = fileBase64;
        requestBody.pdf_base64 = fileBase64;
        if (mimeType) {
          requestBody.mime_type = mimeType;
        }
        const fileType = mimeType?.startsWith("image/") ? "image" : "PDF";
        console.log(`Processing ${fileType} with OCR mode:`, ocrMode);
      } else {
        throw new Error("No file data provided");
      }
      if (apiKey) {
        requestBody.openai_api_key = apiKey;
        console.log("Sending request with API key:", `sk-...${apiKey.slice(-4)}`);
      } else {
        console.log("No API key found, sending request without key");
      }
      const response = await fetch(`${API_BASE_URL}/api/process-pdf`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(
          M(response.status).with(401, () => "Invalid or missing API key. Please check your OpenAI API key in Settings.").with(429, () => "Rate limit exceeded. Please wait a moment and try again.").with(503, () => "Unable to connect to OpenAI. Please check your internet connection.").otherwise(() => error.detail || "Server error")
        );
      }
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || "Processing failed");
      }
      processingState = { status: "ready", mappings: result.mappings, tabId };
      chrome.runtime.sendMessage({ type: "PROCESSING_COMPLETE", mappings: result.mappings }).catch(() => {
      });
    } catch (error) {
      processingState = { status: "error", error: error.message, tabId };
      chrome.runtime.sendMessage({ type: "PROCESSING_ERROR", error: error.message }).catch(() => {
      });
    }
  }
  async function fillFormFromBackground(tabId, mappings, clearExisting) {
    const fillData = {};
    for (const mapping of mappings) {
      fillData[mapping.fieldId] = mapping.value;
    }
    try {
      await chrome.tabs.sendMessage(tabId, { type: "FILL_FORM", data: fillData, clearExisting });
      processingState = { status: "idle" };
    } catch (error) {
      console.error("Failed to fill form:", error);
    }
  }
  async function handleApiRequest(endpoint, method = "GET", data) {
    const url = `${API_BASE_URL}${endpoint}`;
    const options = {
      method,
      headers: {
        "Content-Type": "application/json"
      }
    };
    if (data && method !== "GET") {
      options.body = JSON.stringify(data);
    }
    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
    return response.json();
  }
  chrome.action.onClicked.addListener(async (tab) => {
    if (tab.id) {
      await chrome.storage.local.set({ targetTabId: tab.id });
    }
    chrome.tabs.create({
      url: chrome.runtime.getURL("popup.html")
    });
  });
  chrome.runtime.onInstalled.addListener((details) => {
    console.log("Extension installed:", details.reason);
    if (details.reason === "install") {
      chrome.storage.local.set({
        settings: {
          apiUrl: API_BASE_URL,
          enabled: true
        }
      });
    }
  });
})();
