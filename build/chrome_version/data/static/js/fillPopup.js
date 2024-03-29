function generateSlider(tabId, offline) {
  // Dynamic Slider element
  return `<label class="switch" for="${tabId}">
    <input ${offline}  type="checkbox" id="${tabId}"/>
    <div class="slider round"></div></label>`;
}
function toggleAllUI() {
  const sliders = [].slice.call(
    document.querySelectorAll("#mainTable input"),
    1
  );
  for (let slider of sliders) slider.checked = !slider.checked;
}
async function getWindow() {
  return await new Promise((resolve, _) => {
    chrome.windows.getCurrent((d) => resolve(d));
  });
}
async function traverseTabs(tabs, offlineTabs) {
  // Get bare-bones table from popup.html
  const table = document.getElementById("mainTable");
  const win = await getWindow();
  const uniqWin = -7781 + win.id;
  let i = 0,
    // Window option data
    allTabs = [];
  tabs.reverse(); // Easier UX for newer tabs in the top
  tabs.unshift({ id: uniqWin, title: "Current Window" });
  for (let tab of tabs) {
    let row = table.insertRow(++i);
    let cells = [row.insertCell(0), row.insertCell(1)];
    // Check if tab is in store (background message)
    if (offlineTabs.has(tab.id))
      cells[0].innerHTML = generateSlider(tab.id, "checked");
    else cells[0].innerHTML = generateSlider(tab.id);
    // Title cell (same amount of chars as default tab length)
    cells[1].innerHTML = tab.title.substring(0, 20);
    allTabs.push(tab.id);
    // Add UI listener per event for corresponding tab (via global ID)
    cells[0].addEventListener("click", (event) => {
      const uiClickedId = event.target.getAttribute("id");
      if (uiClickedId == uniqWin) {
        // Send async message and update UI for all toggles
        chrome.runtime.sendMessage({ type: "windowOffline", ids: allTabs });
        toggleAllUI();
      } else if (uiClickedId) {
        chrome.runtime.sendMessage({ type: "addOfflineTab", id: uiClickedId });
      }
    });
  }
}
async function pollBackgroundData(tabs) {
  // Communicator between background and UI
  // Get current offline tabs, populate accordingly,
  // allow for updates, and send updates back to background script
  await chrome.runtime.sendMessage(
    {
      type: "getOfflineTabs",
    },
    (res) => traverseTabs(tabs, new Set(res.data))
  );
}
function fillOnlineTab() {
  // Get tabs and populate UI on popup click
  chrome.tabs.query({ currentWindow: true }, pollBackgroundData);
}
// Initalizer function for UI
fillOnlineTab();
