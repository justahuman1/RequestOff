function generateSlider(i, offline) {
  return `<label class="switch" for="checkbox${i}">
    <input ${offline} type="checkbox" id="checkbox${i}"/>
    <div class="slider round"></div></label>`;
}
async function traverseTabs(tabs) {
  const offlineTabs = await browser.runtime.sendMessage({
    type: "getOfflineTabs",
  });
  const table = document.getElementById("mainTable");
  let i = 0;
  for (let tab of tabs) {
    let row = table.insertRow(++i);
    let cell1 = row.insertCell(0);
    let cell2 = row.insertCell(1);
    if (offlineTabs.has(tab.id)) cell1.innerHTML = generateSlider(i, "checked");
    else cell1.innerHTML = generateSlider(i);

    cell2.innerHTML = tab.title;
  }
}

function fillOnlineTab() {
  browser.tabs
    .query({ currentWindow: true })
    .then(traverseTabs)
    .catch(() => alert("Failed Window Parsing."));
}
fillOnlineTab();
