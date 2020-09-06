browser.menus.create(
  {
    id: "offline-tab",
    title: "Request Off",
    contexts: ["all"],
    icons: {
      "16": "data/svg/icon.svg",
      "32": "data/svg/icon.svg",
    },
  } // Initalize RO storage for offline disk buffer
  // () => localStorage.setItem("offline_tabs_ro", "")
);
const inMemoryStorage = new Set();

// Shortcut commands
browser.commands.onCommand.addListener((command) => {
  // Dispatch offline mode on current active tab
  if (command === "toggle-requests-in-tab") {
    browser.tabs.query({ currentWindow: true, active: true }).then(
      (res) => sendOfflineMessage(res[0].id),
      () => console.log("Shortcut Instantiation Failed")
    );
  }
});
// tab object (for dev)
//  {"id":2,"index":0,"windowId":1,"highlighted":true,"active":true,"attention":false,"pinned":false,"status":"complete","hidden":false,"discarded":false,"incognito":false,"width":1918,"height":1004,"lastAccessed":1598825219744,"audible":false,"mutedInfo":{"muted":false},"isArticle":false,"isInReaderMode":false,"sharingState":{"camera":false,"microphone":false},"successorTabId":-1,"url":"about:debugging#/runtime/this-firefox","title":"Debugging - Runtime / this-firefox","favIconUrl":"chrome://browser/skin/developer.svg"} background.js:26:13

function normalizeGetLocalStorage() {
  // Rather than pushing to localStorage (expensive), we will
  // push the data to localStorage only when browser is closed
  // via onClose trigger. Else, we use a set for quick ops.
  // Old localStorage code in commit 61143d4
  return inMemoryStorage;
}

function sendOfflineMessage(tabId) {
  // Trigger to add tab to inMemoryStorage if not
  // in set. Else, remove. Provides toggle functionality.
  let dynamicNotiDetails = {};
  if (inMemoryStorage.has(tabId)) {
    dynamicNotiDetails["message"] = "This tab is now live!";
    dynamicNotiDetails["iconUrl"] = "data/svg/online.svg";
    inMemoryStorage.delete(tabId);
  } else {
    dynamicNotiDetails[
      "message"
    ] = `This tab is now offline: "${tab.title.substring(0, 15)}..."`;
    dynamicNotiDetails["iconUrl"] = "data/svg/offline.svg";
    inMemoryStorage.add(tabId);
  }

  // Add to block list and send notification
  browser.notifications.create({
    type: "basic",
    title: "RequestOff",
    ...dynamicNotiDetails,
  });
}

browser.menus.onClicked.addListener(async function (info, tab) {
  if (info.menuItemId == "offline-tab") {
    sendOfflineMessage(Number(tab.id));
    // Inject content script to monitor and prompt for going online
    // browser.tabs.executeScript({
    //   code: `alert("location:${}");`,
    // });
  }
});

function injectConfirmGoingOnline() {}

function cancelRequest(requestDetails) {
  // Block request if tab in block-list and prompt going online
  // if website is already offline and a request was detected
  // Issue here: Determine if request was user or server
  if (inMemoryStorage.has(requestDetails.tabId)) {
    injectConfirmGoingOnline();
    return { cancel: true };
  }
}

browser.webRequest.onBeforeRequest.addListener(
  cancelRequest,
  { urls: ["*://*/*"] },
  ["blocking"]
);
