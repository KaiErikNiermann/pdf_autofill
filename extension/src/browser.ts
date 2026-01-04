// Browser API polyfill for cross-browser compatibility
// This normalizes differences between Chrome and Firefox

declare const browser: typeof chrome | undefined;

// Use 'browser' namespace if available (Firefox), otherwise 'chrome'
const browserAPI: typeof chrome = typeof browser !== 'undefined' ? browser : chrome;

export default browserAPI;
