chrome.contextMenus.create(
  // Used for context menu (quick toggle)
  {
    id: "offline-tab",
    title: "Toggle Tab Requests",
    contexts: ["all"],
  }, // Initalize RO storage for serialized disk buffer
  () => localStorage.setItem("offline_tabs_ro", "")
);
// Set used of O(1) operations (goal: minimize injected script overhead)
const inMemoryStorage = new Set();

function sendOfflineMessage(tabId, tabTitle = "") {
  // Trigger to add tab to inMemoryStorage if not
  // in set. Else, remove. Provides toggle functionality.
  let dynamicNotiDetails = {};
  if (inMemoryStorage.has(tabId)) {
    dynamicNotiDetails["message"] = "This tab is now live!";
    dynamicNotiDetails["iconUrl"] = "data/svg/online.svg";
    inMemoryStorage.delete(tabId);
  } else {
    // Tab not found in store. Add and Send corresponding noti
    dynamicNotiDetails[
      "message"
    ] = `This tab is now offline: "${tabTitle.substring(0, 15)}..."`;
    dynamicNotiDetails["iconUrl"] = "data/svg/offline.svg";
    inMemoryStorage.add(tabId);
  }
  // Add to block list and send notification
  if (tabTitle) {
    chrome.notifications.create({
      type: "basic",
      title: "RequestOff",
      ...dynamicNotiDetails,
    });
  }
}
// // Communicator with popup html
chrome.runtime.onMessage.addListener((data, _, responder) => {
  switch (data.type) {
    case "getOfflineTabs":
      // Send store to frontend
      responder({ data: [...inMemoryStorage] });
      return;
    case "addOfflineTab":
      // Get UI change and update store
      sendOfflineMessage(Number(data.id));
      // No return value to asynchronously
      // update background data
      return;
    case "windowOffline":
      for (id of data.ids) {
        sendOfflineMessage(Number(id));
      }
    default:
      return;
  }
});
// // Shortcut commands
chrome.commands.onCommand.addListener((command) => {
  // Dispatch offline mode on current active tab
  if (command === "toggle-requests-in-tab") {
    chrome.tabs.query({ currentWindow: true, active: true }).then(
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
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
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
    // Chrome takes a different approach to
    // requestBlocking than Firefox
    return { redirectUrl: "javascript:" };
  }
}
chrome.webRequest.onBeforeRequest.addListener(
  // Main event dispatcher for request management
  // Fires on all requests (as the extension may run
  // on all URL's). Blocking mode enabled to compltely
  // reject incoming & outgoing requests.
  cancelRequest,
  { urls: ["<all_urls>"] },
  ["blocking"]
);
