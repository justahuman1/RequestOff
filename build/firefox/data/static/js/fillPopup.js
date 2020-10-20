function generateSlider(tabId, offline) {
  // Dynamic Slider element
  return `<label class="switch" for="${tabId}">
    <input ${offline}  type="checkbox" id="${tabId}"/>
    <div class="slider round"></div></label>`;
}
function swapState(state, offline = false, id) {
  const loc = offline ? 1 : 0;
  const antiLoc = offline ? 0 : 1;
  state[loc][id] = state[antiLoc][id];
  delete state[antiLoc][id];
  return state;
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
    // [OnlineTabs, OfflineTabs]
    tabState = [{}, {}],
    // Window option data
    allTabs = new Set();
  tabs.reverse(); // Easier UX for newer tabs in the top
  tabs.unshift({ id: uniqWin, title: "Current Window" });
  for (let tab of tabs) {
    let row = table.insertRow(++i);
    let cells = [row.insertCell(0), row.insertCell(1)];
    let online;
    if (i == 1) curWinCell = cells[0];
    // Check if tab is in store (background message)
    if (offlineTabs.has(tab.id)) {
      online = 1;
      cells[0].innerHTML = generateSlider(tab.id, "checked");
    } else {
      online = 0;
      cells[0].innerHTML = generateSlider(tab.id);
    }
    tabState[online][tab.id] = {
      element: cells[0],
      checked: online == 0 ? true : false,
    };
    allTabs.add(tab.id);
    // Title cell (same amount of chars as default tab length)
    cells[1].innerHTML = tab.title.substring(0, 20);
    // Add UI listener per event for corresponding tab (via global ID)
    cells[0].addEventListener("click", (event) => {
      let uiClickedId = Number(event.target.getAttribute("id"));
      // Send async message for event toggling
      if (uiClickedId == uniqWin) {
        // Current Window button
        tabState = handleWindowButton(allTabs, tabState);
      } else if (uiClickedId) {
        // Individual Tab button
        tabState = handleTabButton(
          allTabs,
          tabState,
          uiClickedId,
          uniqWin,
          curWinCell
        );
      }
    });
  }
  // Window lock safety for new && closed tabs
  if (Object.keys(tabState[1]).length == allTabs.size - 1) {
    if (uniqWin in tabState[1]) {
      browser.runtime.sendMessage({ type: "addOfflineTab", id: uniqWin });
      curWinCell.innerHTML = generateSlider(uniqWin);
      tabState = swapState(tabState, false, uniqWin);
    } else {
      browser.runtime.sendMessage({ type: "addOfflineTab", id: uniqWin });
      curWinCell.innerHTML = generateSlider(uniqWin, "checked");
      tabState = swapState(tabState, true, uniqWin);
    }
  }
}
function handleTabButton(allTabs, tabState, uiClickedId, uniqWin, curWinCell) {
  // 1. Change App state
  // 2. Change backend inMemoryStorage state
  // 3. Change frontend button state
  // 4. Check for additional element changes (rerun 1-4)
  if (uiClickedId in tabState[0]) {
    // Requests Online => Off
    tabState = swapState(tabState, true, uiClickedId);
    if (Object.keys(tabState[1]).length == allTabs.size - 1) {
      curWinCell.innerHTML = generateSlider(uniqWin, "checked");
      tabState = swapState(tabState, true, uniqWin);
      browser.runtime.sendMessage({ type: "addOfflineTab", id: uniqWin });
    }
  } else {
    // Requests Offline => On
    tabState[0][uiClickedId] = tabState[1][uiClickedId];
    delete tabState[1][uiClickedId];
    if (Object.keys(tabState[0]).length == 1) {
      curWinCell.innerHTML = generateSlider(uniqWin);
      tabState = swapState(tabState, false, uniqWin);
      browser.runtime.sendMessage({ type: "addOfflineTab", id: uniqWin });
    }
    curWinCell.innerHTML = generateSlider(uniqWin);
  }
  browser.runtime.sendMessage({ type: "addOfflineTab", id: uiClickedId });
  return tabState;
}
function handleWindowButton(allTabs, tabState) {
  if (Object.keys(tabState[1]).length == allTabs.size) {
    // Requests Offline => On
    tabState = [{ ...tabState[0], ...tabState[1] }, {}];
    browser.runtime.sendMessage({
      type: "windowOffline",
      ids: allTabs,
    });
    toggleAllUI(allTabs);
  } else if (Object.keys(tabState[0]).length == allTabs.size) {
    // Requests Online => Off
    tabState = [{}, { ...tabState[0], ...tabState[1] }];
    browser.runtime.sendMessage({
      type: "windowOffline",
      ids: allTabs,
    });
    toggleAllUI(allTabs);
  } else {
    // `x` online tabs and `y` offline tabs
    // Turns all online tabs to offline
    let curOnlineTabs = new Set(Object.keys(tabState[0]).map((i) => Number(i)));
    browser.runtime.sendMessage({
      type: "windowOffline",
      ids: curOnlineTabs,
    });
    toggleAllUI(curOnlineTabs);
    tabState = [{}, { ...tabState[0], ...tabState[1] }];
  }
  return tabState;
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
