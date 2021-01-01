let trs,
  vimState = "",
  uniqWin,
  // Pointer to window cell element
  curWinCell,
  excludedTabs;
// Window option data
(allTabs = new Set()),
  // [OnlineTabs, OfflineTabs]
  (tabState = [{}, {}]);

function generateSlider(tabId, offline, style = "") {
  // Dynamic Slider element
  return `<label class="switch" for="${tabId}">
    <input ${offline}  type="checkbox" id="${tabId}"/>
    <div style="${style}" class="slider round"></div></label>`;
}
function generatePointer(data) {
  return `<p id="pointer" data="${data}">➠</p>`;
}
function syncExcluded() {
  let remTabSize = allTabs.size - excludedTabs.size;
  let offSize = Object.keys(tabState[1]).length;
  if (
    offSize == remTabSize ||
    (uniqWin in tabState[0] && offSize + 1 == remTabSize)
  )
    tabState = stateTransaction(tabState, curWinCell, true);
  else tabState = stateTransaction(tabState, curWinCell, false);
}
function attachVimShortcuts(e, shortcuts, table) {
  // Supports Vim mode for UI  - Get the data number
  // -> ++/--data & add the pointer to the next/prev row
  let curPointer = document.getElementById("pointer");
  let curRow = Number(curPointer.getAttribute("data"));
  let tabId, tempRow;
  switch (e.key) {
    case shortcuts[0]: // Arrow Up
      curPointer.remove();
      curRow -= vimState == "" ? 1 : Number(vimState);
      if (curRow < 1) curRow = 1;
      trs[curRow].scrollIntoView();
      trs[curRow].children[0].innerHTML = generatePointer(curRow);
      vimState = "";
      break;
    case shortcuts[1]: // Arrow Down
      curPointer.remove();
      curRow += vimState == "" ? 1 : Number(vimState);
      if (curRow >= trs.length) curRow = trs.length - 1;
      trs[curRow].scrollIntoView();
      trs[curRow].children[0].innerHTML = generatePointer(curRow);
      vimState = "";
      break;
    case shortcuts[2]: // Toggle mode
      tempRow = vimState == "" ? 1 : Number(vimState);
      let i = -1,
        pointerLoc;
      while (curRow + i < trs.length && tempRow > 0) {
        pointerLoc = curRow + ++i;
        tabId = trs[pointerLoc].children[1].children[0].getAttribute("for");
        if (excludedTabs.has(Number(tabId))) {
          tempRow--;
          continue;
        }
        // Update internal & backend state
        if (tabId == uniqWin) {
          tabState = handleWindowButton(allTabs, tabState);
        } else {
          tabState = handleTabButton(allTabs, tabState, tabId);
        }
        // Update current key state (programatically
        // since key's do not trigger touch events)
        trs[pointerLoc].children[1].innerHTML = generateSlider(
          tabId,
          Object.keys(tabState[0]).includes(tabId) ? null : "checked"
        );
        tempRow--;
      }
      vimState = "";
      break;
    case shortcuts[3]: // Home
      curPointer.remove();
      curRow = 1;
      trs[curRow].children[0].innerHTML = generatePointer(curRow);
      vimState = "";
      window.scrollTo(0, 0);
      break;
    case shortcuts[4]: // End
      curPointer.remove();
      curRow = trs.length - 1;
      trs[curRow].children[0].innerHTML = generatePointer(curRow);
      vimState = "";
      window.scrollTo(0, document.body.scrollHeight);
      break;
    case shortcuts[5]: // Go to Tab
      tabId = trs[curRow].children[1].children[0].getAttribute("for");
      browser.tabs.update(Number(tabId), { active: true });
      window.close();
      break;
    case shortcuts[6]: // Close Popup
      window.close();
      break;
    case shortcuts[7]: // Ignore Tab
      // TODO: Allow motions
      // TODO: If tab is in offline, turn it back online (UI)
      tabId = Number(trs[curRow].children[1].children[0].getAttribute("for"));
      browser.runtime.sendMessage({ type: "toggleExcludedTab", id: tabId });
      if (excludedTabs.has(tabId)) {
        trs[curRow].children[1].innerHTML = generateSlider(tabId, null);
        excludedTabs.delete(tabId);
      } else {
        trs[curRow].children[1].innerHTML = generateSlider(
          tabId,
          "disabled",
          "background-color: #752828"
        );
        excludedTabs.add(tabId);
      }
      syncExcluded();
      break;
    case shortcuts[8]: // Close Tab
      if (curRow == 1) break;
      curPointer.remove();
      tempRow = vimState == "" ? 1 : Number(vimState);
      while (curRow < trs.length && tempRow > 0) {
        // Add while loop to delete vimState amount of tabs
        tabId = Number(trs[curRow].children[1].children[0].getAttribute("for"));
        table.deleteRow(curRow);
        browser.tabs.remove(tabId);
        tempRow--;
      }
      const rem = curRow > trs.length - 1 ? trs.length - 1 : curRow;
      trs[rem].children[0].innerHTML = generatePointer(curRow);
      trs[rem].scrollIntoView();
      vimState = "";
      break;
    case shortcuts[9]: // Open global settings
      browser.tabs.create({ url: "../optionsStore/options.html" });
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
    const sliderId = Number(slider.id);
    if (onlineTabs.has(sliderId) && !excludedTabs.has(sliderId)) {
      slider.checked = !slider.checked;
    }
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

  let movements = (await browser.storage.local.get("movements")).movements;
  const table = document.getElementById("mainTable");
  document.addEventListener("keypress", (e) =>
    attachVimShortcuts(e, movements, table)
  );
  const offlineTabs = await browser.runtime.sendMessage({
    type: "getOfflineTabs",
  });
  excludedTabs = await browser.runtime.sendMessage({
    type: "getExcludedTabs",
  });
  let curTabId = (
    await browser.tabs.query({ active: true, currentWindow: true })
  )[0].id;
  trs = document.getElementsByTagName("tr");
  const win = await browser.windows.getCurrent();
  uniqWin = -7781 + win.id;
  // Get bare-bones table from popup.html
  let i = 0,
    unseen = false;
  tabs.reverse(); // Easier UX for newer tabs in the top
  tabs.unshift({ id: uniqWin, title: "This Window" });
  for (let tab of tabs) {
    let row = table.insertRow(++i);
    let cells = [row.insertCell(0), row.insertCell(1), row.insertCell(2)];
    let online;
    if (i == 1) {
      curWinCell = cells[1];
    } else if (tab.id == curTabId) {
      // Add arrow pointer to current tab
      cells[0].innerHTML = generatePointer(row.rowIndex);
      row.scrollIntoView();
    }

    // Check if tab is in store (background message)
    if (offlineTabs.has(tab.id)) {
      online = 1;
      cells[1].innerHTML = generateSlider(tab.id, "checked");
    } else if (excludedTabs.has(tab.id)) {
      online = 0;
      cells[1].innerHTML = generateSlider(
        tab.id,
        "disabled",
        "background-color: #752828"
      );
    } else {
      online = 0;
      cells[1].innerHTML = generateSlider(tab.id);
      // Sticky lock -> If ever set to true, cannot be unset
      unseen = tab.id == uniqWin && !unseen ? false : true;
    }
    tabState[online][tab.id] = {
      element: cells[1],
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
  // let remTabSize = allTabs.size - excludedTabs.size; // -1 for window button
  if (uiClickedId in tabState[0]) {
    // Requests Online => Off
    tabState = swapState(tabState, true, uiClickedId);
    let remTabSize = allTabs.size - excludedTabs.size;
    let offSize = Object.keys(tabState[1]).length;
    if (
      offSize == remTabSize ||
      (uniqWin in tabState[0] && offSize + 1 == remTabSize)
    )
      tabState = stateTransaction(tabState, curWinCell, true);
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
  let remTabSize = allTabs.size - excludedTabs.size;
  if (Object.keys(tabState[1]).length == remTabSize) {
    // Requests Offline => On
    tabState = [{ ...tabState[0], ...tabState[1] }, {}];
    windowMessenger(allTabs);
  } else if (Object.keys(tabState[0]).length == remTabSize) {
    // Requests Online => Off
    tabState = [{}, { ...tabState[0], ...tabState[1] }];
    for (let mew in tabState[1]) {
      let numMew = Number(mew);
      if (excludedTabs.has(numMew)) delete tabState[1][numMew];
    }
    windowMessenger(allTabs);
  } else {
    // `x` online tabs and `y` offline tabs
    // Turns `x` online tabs to offline
    let curOnlineTabs = new Set(Object.keys(tabState[0]).map((i) => Number(i)));
    tabState = [{}, { ...tabState[0], ...tabState[1] }];
    for (let mew in tabState[1]) {
      let numMew = Number(mew);
      if (excludedTabs.has(numMew)) {
        delete tabState[1][numMew];
      }
    }
    windowMessenger(curOnlineTabs);
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

/**
 * ROff Notification Popup

<div class="v-wrap">
    <article class="v-box">
        <p>This is how I've been doing it for some time</p>
    </article>
</div>

body,html{
    height: 100%;
    margin: 0;
    padding: 0;
}
.v-wrap{
    height: 100%;
    text-align: center;
    white-space: nowrap;
}
.v-wrap:before{
    content: "";
    display: inline-block;
    vertical-align: middle;
    width: 0;
    margin-right: -.25em;
    height: 100%;
}
.v-box{
    display: inline-block;
    vertical-align: middle;
    white-space: normal;
    padding: 0 1em;
    background: #EEE;
}
background: : #0d2148
text (body > *): #e8e4e4  (or white)
*/
