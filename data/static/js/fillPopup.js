function generateSlider(tabId, offline) {
  // Dynamic Slider element
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
  // Get bare-bones table from popup.html
  const table = document.getElementById("mainTable");
  let i = 0;
  for (let tab of tabs) {
    let row = table.insertRow(++i);
    let cells = [row.insertCell(0), row.insertCell(1)];
    // Check if tab is in store (background message)
    if (offlineTabs.has(tab.id))
      cells[0].innerHTML = generateSlider(tab.id, "checked");
    else cells[0].innerHTML = generateSlider(tab.id);
    // Title cell (same amount of chars as default tab length)
    cells[1].innerHTML = tab.title.substring(0, 20);
    // Add UI listener per event for corresponding tab (via global ID)
    cells[0].addEventListener("click", (event) => {
      let uiClickedId = event.target.getAttribute("id");
      if (uiClickedId) {
        browser.runtime.sendMessage({ type: "addOfflineTab", id: uiClickedId });
      }
    });
  }
}
function fillOnlineTab() {
  // Get tabs and populate UI on popup click
  browser.tabs
    .query({ currentWindow: true })
    .then(traverseTabs)
    .catch(() => alert("Failed Window Parsing.."));
}
// Initalizer function for UI
fillOnlineTab();
