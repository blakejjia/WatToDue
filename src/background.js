// WatToDue Background Service Worker

// 1. Silent seamless background auto-update
if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onUpdateAvailable) {
  chrome.runtime.onUpdateAvailable.addListener((details) => {
    // When a new version is downloaded by Chrome in the background, reload silently
    chrome.runtime.reload();
  });
}
