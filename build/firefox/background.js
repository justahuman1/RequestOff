browser.menus.create(
  // Used for context menu (quick toggle)
  {
    id: "offline-tab",
    title: "Toggle Tab Requests",
    contexts: ["all"],
    icons: {
      "16": "data/svg/icon.svg",
      "32": "data/svg/icon.svg",
    },
  }, // Initalize RO storage for serialized disk buffer
  () =>
    browser.storage.local.set({
      movements: ["k", "j", "g", "G", "n", "t", "e", "x", "s"],
    }) // Set initial shortcut keys
  // () => localStorage.setItem("offline_tabs_ro", "")
);
// Set used of O(1) operations (goal: minimize injected script overhead)
const inMemoryStorage = new Set();
function alertFrontState(offline) {
  return offline
    ? `document.title = '📵 ' + document.title`
    : `document.title = document.title.substring(2)`;
}
function sendOfflineMessage(tabId, tabTitle = "") {
  // Trigger to add tab to inMemoryStorage if not
  // in set. Else, remove. Provides toggle functionality.
  let dynamicNotiDetails = {};
  let offline;
  if (inMemoryStorage.has(tabId)) {
    dynamicNotiDetails["message"] = "This tab is now live!";
    dynamicNotiDetails["iconUrl"] = "data/svg/online.svg";
    offline = false;
    inMemoryStorage.delete(tabId);
  } else {
    // Tab not found in store. Add and Send corresponding noti
    dynamicNotiDetails[
      "message"
    ] = `This tab is now offline: "${tabTitle.substring(0, 15)}..."`;
    dynamicNotiDetails["iconUrl"] = "data/svg/offline.svg";
    offline = true;
    inMemoryStorage.add(tabId);
  }
  // Add to block list and send notification
  if (tabTitle) {
    browser.tabs.executeScript({
      tabId,
      code: alertFrontState(offline),
    });
    // browser.notifications.create({
    //   type: "basic",
    //   title: "RequestOff",
    //   ...dynamicNotiDetails,
    // });
  }
}
// Communicator with popup html
browser.runtime.onMessage.addListener((data) => {
  switch (data.type) {
    case "getOfflineTabs":
      // Send store to frontend
      return Promise.resolve(inMemoryStorage);
    case "toggleOfflineTab":
      // Get UI change and update store
      sendOfflineMessage(Number(data.id));
      return Promise.resolve(null);
    case "windowOffline":
      for (let id of data.ids) {
        sendOfflineMessage(Number(id));
      }
    default:
      return;
  }
});
// Shortcut commands
browser.commands.onCommand.addListener((command) => {
  // Dispatch offline mode on current active tab
  if (command === "toggle-requests-in-tab") {
    browser.tabs.query({ currentWindow: true, active: true }).then(
      (res) => sendOfflineMessage(res[0].id, res[0].title),
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
    sendOfflineMessage(Number(tab.id), tab.title);
    // Inject content script to monitor and prompt for going online
    // browser.tabs.executeScript({
    //   code: `alert("location:${}");`,
    // });
  }
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
