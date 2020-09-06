function generateSlider(tabId, offline) {
  return `<label class="switch" for="${tabId}">
    <input ${offline}  type="checkbox" id="${tabId}"/>
    <div class="slider round"></div></label>`;
}
async function traverseTabs(tabs) {
  // Communicator between background and UI
  // Get current offline tabs, populate accordingly,
  // allow for updates, and send updates back to background script
  const offlineTabs = await browser.runtime.sendMessage({
    type: "getOfflineTabs",
  });
  const table = document.getElementById("mainTable");
  let i = 0;
  for (let tab of tabs) {
    let row = table.insertRow(++i);
    let cell1 = row.insertCell(0);
    let cell2 = row.insertCell(1);
    if (offlineTabs.has(tab.id))
      cell1.innerHTML = generateSlider(tab.id, "checked");
    else cell1.innerHTML = generateSlider(tab.id);
    cell2.innerHTML = tab.title;

    cell1.addEventListener("click", (event) => {
      let uiClickedId = event.target.getAttribute("id");
      if (uiClickedId) {
        browser.runtime.sendMessage({ type: "addOfflineTab", id: uiClickedId });
      }
    });
  }
}
function fillOnlineTab() {
  // Get tabs and populate UI
  browser.tabs
    .query({ currentWindow: true })
    .then(traverseTabs)
    .catch(() => alert("Failed Window Parsing."));
}
fillOnlineTab();
