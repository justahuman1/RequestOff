let trs,
  vimState = "",
  uniqWin,
  // Pointer to window cell element
  curWinCell,
  // Window option data
  allTabs = new Set(),
  // [OnlineTabs, OfflineTabs]
  tabState = [{}, {}];

function generateSlider(tabId, offline) {
  // Dynamic Slider element
  return `<label class="switch" for="${tabId}">
    <input ${offline}  type="checkbox" id="${tabId}"/>
    <div class="slider round"></div></label>`;
}
function generatePointer(data) {
  return `<p id="pointer" data="${data}" style="margin:0px;">➡️</p>`;
}
function attachVimShortcuts(e) {
  // Supports Vim mode for UI
  // Get the data number
  // ++/--data
  // add the pointer to the next/prev row
  let curPointer = document.getElementById("pointer");
  let curRow = Number(curPointer.getAttribute("data"));
  let tabId;
  switch (e.key) {
    // move pointer down
    case "j":
      curPointer.remove();
      curRow += vimState == "" ? 1 : Number(vimState);
      let potentialJump = trs.length - 1;
      trs[
        curRow > potentialJump ? potentialJump : curRow
      ].children[0].innerHTML = generatePointer(curRow);
      vimState = "";
      break;
    // move pointer up
    case "k":
      curPointer.remove();
      curRow -= vimState == "" ? 1 : Number(vimState);
      trs[curRow <= 0 ? 1 : curRow].children[0].innerHTML = generatePointer(
        curRow
      );
      vimState = "";
      break;
    // trigger offline toggle
    case "n":
      tabId = trs[curRow].children[1].children[0].getAttribute("for");
      // Update internal & backend state
      if (tabId == uniqWin) {
        tabState = handleWindowButton(allTabs, tabState);
      } else {
        tabState = handleTabButton(allTabs, tabState, tabId);
      }
      // Update current key state (programatically
      // since key's do not trigger touch events)
      trs[curRow].children[1].innerHTML = generateSlider(
        tabId,
        Object.keys(tabState[0]).includes(tabId) ? null : "checked"
      );
      break;
    case "e":
      window.close();
      break;
    case "g":
      curPointer.remove();
      curRow = 1;
      trs[curRow].children[0].innerHTML = generatePointer(curRow);
      vimState = "";
      break;
    case "G":
      curPointer.remove();
      curRow = trs.length - 1;
      trs[curRow].children[0].innerHTML = generatePointer(curRow);
      vimState = "";
      break;
    case "t":
      tabId = trs[curRow].children[1].children[0].getAttribute("for");
      browser.tabs.update(Number(tabId), { active: true });
      window.close();
      break;
    default:
      if (!isNaN(e.key)) {
        vimState += e.key;
      }
      break;
  }
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
  document.addEventListener("keypress", attachVimShortcuts);
  const offlineTabs = await browser.runtime.sendMessage({
    type: "getOfflineTabs",
  });
  trs = document.getElementsByTagName("tr");
  const win = await browser.windows.getCurrent();
  uniqWin = -7781 + win.id;
  // Get bare-bones table from popup.html
  const table = document.getElementById("mainTable");
  let i = 0;
  tabs.reverse(); // Easier UX for newer tabs in the top
  tabs.unshift({ id: uniqWin, title: "Current Window" });
  for (let tab of tabs) {
    let row = table.insertRow(++i);
    let cells = [row.insertCell(0), row.insertCell(1), row.insertCell(2)];
    let online;
    if (i == 1) {
      curWinCell = cells[1];
      cells[0].innerHTML = `<p id="pointer" data="${row.rowIndex}" style="margin:0px;">➡️</p>`;
    }
    // cells[0].innerHTML = `<p id="pointer${row.rowIndex}" style="margin:0px;"></p>`;

    // Check if tab is in store (background message)
    if (offlineTabs.has(tab.id)) {
      online = 1;
      cells[1].innerHTML = generateSlider(tab.id, "checked");
    } else {
      online = 0;
      cells[1].innerHTML = generateSlider(tab.id);
    }
    tabState[online][tab.id] = {
      element: cells[1],
      checked: online == 0 ? true : false,
    };
    allTabs.add(tab.id);
    // Title cell (same amount of chars as default tab length)
    cells[2].innerHTML = tab.title.substring(0, 20);
    // Add UI listener per event for corresponding tab (via global ID)
    cells[1].addEventListener("click", (event) => {
      let uiClickedId = Number(event.target.getAttribute("id"));
      // Send async message for event toggling
      if (uiClickedId == uniqWin) {
        // Current Window button
        tabState = handleWindowButton(allTabs, tabState);
      } else if (uiClickedId) {
        // Individual Tab button
        tabState = handleTabButton(allTabs, tabState, uiClickedId);
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
function handleTabButton(allTabs, tabState, uiClickedId) {
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
