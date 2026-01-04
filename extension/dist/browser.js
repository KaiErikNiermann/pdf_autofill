// Browser API polyfill for cross-browser compatibility
// This normalizes differences between Chrome and Firefox
// Use 'browser' namespace if available (Firefox), otherwise 'chrome'
const browserAPI = typeof browser !== 'undefined' ? browser : chrome;
export default browserAPI;
//# sourceMappingURL=browser.js.map