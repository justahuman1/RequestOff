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
  return `<p id="pointer" data="${data}">➠</p>`;
}
function attachVimShortcuts(e) {
  // Supports Vim mode for UI
  // Get the data number
  // ++/--data
  // add the pointer to the next/prev row
  let curPointer = document.getElementById("pointer");
  let curRow = Number(curPointer.getAttribute("data"));
  let jumpCellHeight = document.body.scrollHeight / trs.length;
  let tabId;
  window.scrollTo(0, jumpCellHeight * curRow);
  switch (e.key) {
    case "j": // move pointer down
      curPointer.remove();
      curRow += vimState == "" ? 1 : Number(vimState);
      if (curRow >= trs.length) curRow = trs.length - 1;
      let potentialJump = trs.length - 1;
      trs[
        curRow > potentialJump ? potentialJump : curRow
      ].children[0].innerHTML = generatePointer(curRow);
      window.scrollTo(0, jumpCellHeight * curRow);
      vimState = "";
      break;
    case "k": // move pointer up
      curPointer.remove();
      curRow -= vimState == "" ? 1 : Number(vimState);
      if (curRow < 1) curRow = 1;
      trs[curRow <= 0 ? 1 : curRow].children[0].innerHTML = generatePointer(
        curRow
      );
      window.scrollTo(0, jumpCellHeight * curRow);
      vimState = "";
      break;
    case "n": // trigger offline toggle
      let tempRow = vimState == "" ? 1 : Number(vimState);
      let i = 0;
      while (curRow + i < trs.length && tempRow > 0) {
        // TODO: Consider window and tab combination error here
        let mew = curRow + i;
        tabId = trs[mew].children[1].children[0].getAttribute("for");
        // Update internal & backend state
        if (tabId == uniqWin) {
          tabState = handleWindowButton(allTabs, tabState);
        } else {
          tabState = handleTabButton(allTabs, tabState, tabId);
        }
        // Update current key state (programatically
        // since key's do not trigger touch events)
        trs[mew].children[1].innerHTML = generateSlider(
          tabId,
          Object.keys(tabState[0]).includes(tabId) ? null : "checked"
        );
        tempRow--;
        i++;
      }
      vimState = "";
      break;
    case "e": // Escape
      window.close();
      break;
    case "g": // Go to top
      curPointer.remove();
      curRow = 1;
      trs[curRow].children[0].innerHTML = generatePointer(curRow);
      vimState = "";
      window.scrollTo(0, 0);
      break;
    case "G": // Go to bottom
      curPointer.remove();
      curRow = trs.length - 1;
      trs[curRow].children[0].innerHTML = generatePointer(curRow);
      vimState = "";
      window.scrollTo(0, document.body.scrollHeight);
      break;
    case "t": // Go to chosen tab
      tabId = trs[curRow].children[1].children[0].getAttribute("for");
      browser.tabs.update(Number(tabId), { active: true });
      window.close();
      break;
    default:
      // Add to vim state
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
function stateTransaction(tabState, curWinCell, checked = false) {
  // 1. Change App state
  // 2. Change backend inMemoryStorage state
  // 3. Change frontend button state
  // 4. Check for additional element changes (rerun 1-4)
  curWinCell.innerHTML = generateSlider(uniqWin, checked ? "checked" : null);
  tabState = swapState(tabState, checked, uniqWin);
  browser.runtime.sendMessage({ type: "toggleOfflineTab", id: uniqWin });
  return tabState;
}
async function traverseTabs(tabs) {
  // Communicator between background and UI
  // Get current offline tabs, populate accordingly,
  // allow for updates, and send updates back to background script
  document.addEventListener("keypress", attachVimShortcuts);
  const offlineTabs = await browser.runtime.sendMessage({
    type: "getOfflineTabs",
  });
  const curTabId = (await browser.tabs.query({ active: true }))[0].id;
  trs = document.getElementsByTagName("tr");
  const win = await browser.windows.getCurrent();
  uniqWin = -7781 + win.id;
  // Get bare-bones table from popup.html
  const table = document.getElementById("mainTable");
  let i = 0,
    unseen = false;
  tabs.reverse(); // Easier UX for newer tabs in the top
  tabs.unshift({ id: uniqWin, title: "Current Window" });
  for (let tab of tabs) {
    let row = table.insertRow(++i);
    let cells = [row.insertCell(0), row.insertCell(1), row.insertCell(2)];
    let online;
    if (i == 1) {
      curWinCell = cells[1];
    } else if (tab.id == curTabId)
      // Add arrow pointer to current tab
      cells[0].innerHTML = generatePointer(row.rowIndex);
    // Check if tab is in store (background message)
    if (offlineTabs.has(tab.id)) {
      online = 1;
      cells[1].innerHTML = generateSlider(tab.id, "checked");
    } else {
      online = 0;
      cells[1].innerHTML = generateSlider(tab.id);
      unseen = i == 1 ? false : true;
    }
    tabState[online][tab.id] = {
      element: cells[1],
      checked: online == 0 ? true : false,
    };
    allTabs.add(tab.id);
    // Title cell (same amount of chars as default tab length)
    cells[2].innerHTML = tab.title.substring(0, 20);
    // Add UI listener per event for corresponding tab (via global ID)
    cells[1].addEventListener("click", (e) => buttonClickListener(e, uniqWin));
  }
  if (unseen && uniqWin in tabState[1]) {
    // Make it unchecked
    tabState = stateTransaction(tabState, curWinCell, false);
  } else if (!unseen && uniqWin in tabState[0]) {
    // Make it checked
    tabState = stateTransaction(tabState, curWinCell, true);
  }
}
function buttonClickListener(event, uniqWin) {
  let uiClickedId = Number(event.target.getAttribute("id"));
  // Send async message for event toggling
  if (uiClickedId == uniqWin) {
    // Current Window button
    tabState = handleWindowButton(allTabs, tabState);
  } else if (uiClickedId) {
    // Individual Tab button
    tabState = handleTabButton(allTabs, tabState, uiClickedId);
  }
}
function handleTabButton(allTabs, tabState, uiClickedId) {
  if (uiClickedId in tabState[0]) {
    // Requests Online => Off
    tabState = swapState(tabState, true, uiClickedId);
    if (Object.keys(tabState[1]).length == allTabs.size - 1) {
      tabState = stateTransaction(tabState, curWinCell, true);
    }
  } else {
    // Requests Offline => On
    tabState = swapState(tabState, false, uiClickedId);
    if (Object.keys(tabState[0]).length - 1 == 0) {
      tabState = stateTransaction(tabState, curWinCell, false);
    }
    curWinCell.innerHTML = generateSlider(uniqWin);
  }
  browser.runtime.sendMessage({ type: "toggleOfflineTab", id: uiClickedId });
  return tabState;
}
function windowMessenger(tabs) {
  browser.runtime.sendMessage({
    type: "windowOffline",
    ids: tabs,
  });
  toggleAllUI(tabs);
}
function handleWindowButton(allTabs, tabState) {
  if (Object.keys(tabState[1]).length == allTabs.size) {
    // Requests Offline => On
    tabState = [{ ...tabState[0], ...tabState[1] }, {}];
    windowMessenger(allTabs);
  } else if (Object.keys(tabState[0]).length == allTabs.size) {
    // Requests Online => Off
    tabState = [{}, { ...tabState[0], ...tabState[1] }];
    windowMessenger(allTabs);
  } else {
    // `x` online tabs and `y` offline tabs
    // Turns `x` online tabs to offline
    let curOnlineTabs = new Set(Object.keys(tabState[0]).map((i) => Number(i)));
    windowMessenger(curOnlineTabs);
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
