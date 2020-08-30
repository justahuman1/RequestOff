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
  () => {
    localStorage.setItem("offline_tabs_ro", "");
  }
);

browser.menus.onClicked.addListener(async function (info, tab) {
  if (info.menuItemId == "offline-tab") {
    const tabID = Number(tab.id);
    let curVals = localStorage.getItem("offline_tabs_ro").split(",");
    curVals = curVals.map((val) => {
      if (!isNaN(val)) return Number(val);
      else return null;
    });
    if (curVals.includes(tabID)) curVals.splice(curVals.indexOf(tabID), 1);
    else curVals.push(tabID);
    console.log(curVals);
    localStorage.setItem("offline_tabs_ro", curVals);
  }
});

browser.webRequest.onBeforeRequest.addListener(
  (details) => {
    console.log(details.tabId);
  },
  { urls: ["*://*/*"] }
);
