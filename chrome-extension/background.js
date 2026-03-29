// Background service worker (Manifest V3).
// Currently used for basic logging and as an integration point
// if you later want to trigger analysis without the popup.

chrome.runtime.onInstalled.addListener(() => {
  console.log("AI Job Automation – LinkedIn Helper installed");
});

