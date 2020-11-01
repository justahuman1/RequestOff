document.addEventListener("DOMContentLoaded", () => {
  // Handle Movements   ======================
  restoreMovementDefaults();
  const movements = document.getElementById("saveMovements");
  movements.addEventListener("click", movementListener);
  // Handle Timers/Cleanup   =================
});
function movementListener() {
  let table = document.getElementById("movements");
  let inputs = table.querySelectorAll("input");
  let arr = [].slice.call(inputs).map((node) => node.value);
  browser.storage.local.set({ movements: arr });
}

function getDefaultMovements() {
  return ["k", "j", "g", "G", "n", "t", "e", "x", "s"];
}

async function restoreMovementDefaults() {
  let table = document.getElementById("movements");
  let inputs = table.querySelectorAll("input");
  let defaults = await browser.storage.local.get("movements");
  if (Object.keys(defaults).length == 0) {
    defaults = getDefaultMovements();
  } else defaults = defaults.movements;
  let i = -1;
  for (let inp of inputs) {
    inp.value = defaults[++i];
  }
}
