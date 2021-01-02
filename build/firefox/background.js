browser.menus.create(
  // Used for context menu (quick toggle)
  {
    id: "offline-tab",
    title: "Toggle Tab Requests",
    contexts: ["all"],
    icons: {
      16: "data/svg/icon.svg",
      32: "data/svg/icon.svg",
    },
  },
  defaultSettings
);
browser.menus.create(
  // Used for context menu (quick toggle)
  {
    id: "exclude-tab",
    title: "Ignore Tab",
    contexts: ["all"],
    icons: {
      16: "data/svg/icon.svg",
      32: "data/svg/icon.svg",
    },
  }
);
// Set used of O(1) operations (goal: minimize injected script overhead)
const inMemoryStorage = new Set(),
  excludedTabs = new Set();
function defaultSettings() {
  // Set initial shortcut keys
  browser.storage.local.set({
    movements: ["k", "j", "n", "g", "G", "t", "e", "i", "x", "s"],
  });
  browser.storage.local.set({
    timers: [false, 90, 30],
  });
  // Initalize RO storage for serialized disk buffer
  // () => localStorage.setItem("offline_tabs_ro", "")
}
function alertFrontState(offline, emoji = "📵") {
  return offline
    ? `document.title = '${emoji} ' + document.title`
    : `document.title = document.title.substring(2)`;
}
function sendOfflineMessage(tabId) {
  // Trigger to add tab to inMemoryStorage if not
  // in set. Else, remove. Provides toggle functionality.
  if (excludedTabs.has(tabId)) return;

  const offline = inMemoryStorage.has(tabId);
  if (offline) inMemoryStorage.delete(tabId);
  else inMemoryStorage.add(tabId);
  // Add to block list and send notification
  if (tabId > 0) {
    browser.tabs.executeScript(tabId, {
      code: alertFrontState(!offline),
    });
  }
}
function sendExcludedMessage(tabId) {
  // Trigger to add tab to excludedTabs if not in set.
  // Else, remove. Provides toggle functionality.
  const offline = excludedTabs.has(tabId);
  if (offline) excludedTabs.delete(tabId);
  else {
    if (inMemoryStorage.has(tabId)) {
      inMemoryStorage.delete(tabId);
      if (tabId > 0)
        browser.tabs.executeScript(tabId, {
          code: alertFrontState(offline),
        });
    }
    excludedTabs.add(tabId);
  }
  if (tabId > 0)
    // Add to exclude list
    browser.tabs.executeScript(tabId, {
      code: alertFrontState(!offline, "🔒"),
    });
}
// Communicator with popup html
browser.runtime.onMessage.addListener((data) => {
  switch (data.type) {
    case "getOfflineTabs":
      // Send store to frontend
      return Promise.resolve(inMemoryStorage);
    case "getExcludedTabs":
      // Send store to frontend
      return Promise.resolve(excludedTabs);
    case "toggleOfflineTab":
      // Get UI change and update store
      sendOfflineMessage(Number(data.id));
      return Promise.resolve(null);
    case "windowOffline":
      for (let id of data.ids) {
        sendOfflineMessage(Number(id));
      }
      return;
    case "setTimerValues":
      timerUpdate(data.values);
      return;
    case "toggleExcludedTab":
      sendExcludedMessage(Number(data.id));
      return;
    default:
      return;
  }
});
// Shortcut commands
browser.commands.onCommand.addListener((command) => {
  // Dispatch offline mode on current active tab
  if (command === "toggle-requests-in-tab") {
    browser.tabs.query({ currentWindow: true, active: true }).then(
      (tab) => sendOfflineMessage(tab[0].id),
      () => console.log("Shortcut Instantiation Failed")
    );
  } else if (command === "toggle-requests-in-window") {
    browser.tabs.query({ currentWindow: true }).then(
      (res) => {
        for (let tab of res) sendOfflineMessage(tab.id);
      },
      () => console.log("Shortcut Instantiation Failed")
    );
  }
});
function normalizeGetLocalStorage() {
  // Rather than pushing to localStorage (expensive), we will
  // push the data to localStorage only when browser is closed
  // via onClose trigger. Else, we use a set for quick ops.
  // Old localStorage code in commit 61143d4
  return inMemoryStorage;
}
browser.menus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId == "offline-tab") {
    sendOfflineMessage(Number(tab.id));
    // Inject content script to monitor and prompt for going online
    // browser.tabs.executeScript({
    //   code: `alert("location:${}");`,
    // });
  }
  if (info.menuItemId == "exclude-tab") sendExcludedMessage(Number(tab.id));
});
// function injectConfirmGoingOnline() {}
function cancelRequest(requestDetails) {
  // Block request if tab in block-list and prompt going online
  // if website is already offline and a request was detected
  // TODO: Issue - Determine if request was user or server
  // Idea: Determine if a click occured in the tab in the previous
  // ~1 second before request occurs. If so, we can guess it was
  // the user, rather than the server.
  if (inMemoryStorage.has(requestDetails.tabId)) {
    // injectConfirmGoingOnline();
    return { cancel: true };
  }
}
browser.webRequest.onBeforeRequest.addListener(
  // Main event dispatcher for request management
  // Fires on all requests (as the extension may run
  // on all URL's). Blocking mode enabled to compltely
  // reject incoming & outgoing requests.
  cancelRequest,
  { urls: ["*://*/*"] },
  ["blocking"]
);
