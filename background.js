browser.menus.create(
  {
    id: "offline-tab",
    title: "Request Off",
    contexts: ["all"],
    icons: {
      "16": "data/svg/icon.svg",
      "32": "data/svg/icon.svg",
    },
  }, // Initalize RO storage
  () => localStorage.setItem("offline_tabs_ro", "")
);
let inMemoryStorage = new Set();

// tab object (for dev)
//  {"id":2,"index":0,"windowId":1,"highlighted":true,"active":true,"attention":false,"pinned":false,"status":"complete","hidden":false,"discarded":false,"incognito":false,"width":1918,"height":1004,"lastAccessed":1598825219744,"audible":false,"mutedInfo":{"muted":false},"isArticle":false,"isInReaderMode":false,"sharingState":{"camera":false,"microphone":false},"successorTabId":-1,"url":"about:debugging#/runtime/this-firefox","title":"Debugging - Runtime / this-firefox","favIconUrl":"chrome://browser/skin/developer.svg"} background.js:26:13

function normalizeGetLocalStorage() {
  let curVals = localStorage.getItem("offline_tabs_ro").split(",");
  return curVals.map((val) => {
    if (!isNaN(val)) return Number(val);
    else return null;
  });
}

browser.menus.onClicked.addListener(async function (info, tab) {
  if (info.menuItemId == "offline-tab") {
    const tabID = Number(tab.id);
    let curVals = normalizeGetLocalStorage();
    if (curVals.includes(tabID)) curVals.splice(curVals.indexOf(tabID), 1);
    else curVals.push(tabID);

    // Add to block list and send notification
    localStorage.setItem("offline_tabs_ro", curVals);
    browser.notifications.create({
      type: "basic",
      title: "RequestOff",
      message: `Turned off Requests for ${tab.title.substring(0, 15)}...`,
      iconUrl: `data/svg/icon2.svg`,
    });

    // Inject content script to monitor and prompt for going online
    // browser.tabs.executeScript({
    //   code: `alert("location:${}");`,
    // });
  }
});

function injectConfirmGoingOnline() {}

function cancelRequest(requestDetails) {
  // console.log(requestDetails);
  let curVals = normalizeGetLocalStorage();
  // Block request if tab in block-list and prompt going online
  if (curVals.includes(requestDetails.tabId)) {
    injectConfirmGoingOnline();
    return { cancel: true };
  }
}

browser.webRequest.onBeforeRequest.addListener(
  cancelRequest,
  { urls: ["*://*/*"] },
  ["blocking"]
);
