function generateSlider(tabId, offline) {
  // Dynamic Slider element
  return `<label class="switch" for="${tabId}">
    <input ${offline}  type="checkbox" id="${tabId}"/>
    <div class="slider round"></div></label>`;
}

function toggleAllUI(onlineTabs) {
  const sliders = [].slice.call(
    document.querySelectorAll("#mainTable input"),
    1
  );
  for (let slider of sliders) {
    if (onlineTabs.has(Number(slider.id))) slider.checked = !slider.checked;
  }
}
async function traverseTabs(tabs) {
  // Communicator between background and UI
  // Get current offline tabs, populate accordingly,
  // allow for updates, and send updates back to background script
  const offlineTabs = await browser.runtime.sendMessage({
    type: "getOfflineTabs",
  });
  const win = await browser.windows.getCurrent();
  const uniqWin = -7781 + win.id;
  // Get bare-bones table from popup.html
  const table = document.getElementById("mainTable");
  let i = 0,
    curWinCell,
    onlineGate = false,
    // Window option data
    allTabs = new Set(),
    onlineTabs = new Set();
  tabs.reverse(); // Easier UX for newer tabs in the top
  tabs.unshift({ id: uniqWin, title: "Current Window" });
  for (let tab of tabs) {
    let row = table.insertRow(++i);
    let cells = [row.insertCell(0), row.insertCell(1)];
    if (i == 1) curWinCell = cells[0];
    // Check if tab is in store (background message)
    if (offlineTabs.has(tab.id))
      cells[0].innerHTML = generateSlider(tab.id, "checked");
    else {
      onlineGate = true;
      onlineTabs.add(tab.id);
      cells[0].innerHTML = generateSlider(tab.id);
    }
    allTabs.add(tab.id);
    // Title cell (same amount of chars as default tab length)
    cells[1].innerHTML = tab.title.substring(0, 20);
    // Add UI listener per event for corresponding tab (via global ID)
    cells[0].addEventListener("click", (event) => {
      let uiClickedId = event.target.getAttribute("id");
      uiClickedId = Number(uiClickedId);
      if (uiClickedId == uniqWin) {
        // Send async message and update UI for all toggles
        if (onlineGate) {
          browser.runtime.sendMessage({
            type: "windowOffline",
            ids: onlineTabs,
          });
          onlineGate = !onlineGate;
          toggleAllUI(onlineTabs);
        } else {
          browser.runtime.sendMessage({
            type: "windowOffline",
            ids: allTabs,
          });
          // onlineGate = !onlineGate;
          toggleAllUI(allTabs);
        }
      } else if (uiClickedId) {
        browser.runtime.sendMessage({ type: "addOfflineTab", id: uiClickedId });
        browser.runtime.sendMessage({
          type: "addOfflineTab",
          id: uniqWin,
        });
        if (onlineTabs.size == 1) {
          curWinCell.innerHTML = generateSlider(uniqWin, "checked");
        } else {
          curWinCell.innerHTML = generateSlider(uniqWin);
          onlineGate = true;
        }
      }
    });
  }
  if (onlineGate) {
    curWinCell.innerHTML = generateSlider(uniqWin);
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
