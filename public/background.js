chrome.action.onClicked.addListener((tab) => {
  chrome.tabs.sendMessage(tab.id, { action: 'togglePanel' });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'openFullApp') {
    chrome.tabs.create({ url: chrome.runtime.getURL('index.html') });
    return;
  }

  if (request.action === 'fetchHolded') {
    const { url, options } = request;
    fetch(url, options)
      .then(async (response) => {
        const text = await response.text();
        sendResponse({
          ok: response.ok,
          status: response.status,
          statusText: response.statusText,
          text
        });
      })
      .catch((error) => {
        sendResponse({
          ok: false,
          error: error.message || String(error)
        });
      });
    return true; // Keep the message channel open for an asynchronous response
  }
});
