document.addEventListener("DOMContentLoaded", () => {
  // Handle Movements   ======================
  restoreMovementDefaults();
  document
    .getElementById("saveMovements")
    .addEventListener("click", movementListener);
  // Handle Timers/Cleanup   =================
  restoreTimerDefaults();
  document.getElementById("saveTimer").addEventListener("click", timerListener);
});

function movementListener() {
  // let table = ;
  let inputs = document.getElementById("movements").querySelectorAll("input");
  let arr = [].slice.call(inputs).map((node) => node.value);
  browser.storage.local.set({ movements: arr });
}
async function restoreMovementDefaults() {
  let inputs = document.getElementById("movements").querySelectorAll("input");
  let defaults = await browser.storage.local.get("movements");
  defaults = defaults.movements;
  let i = -1;
  for (let inp of inputs) {
    inp.value = defaults[++i];
  }
}

async function timerListener() {
  let inputs = document.getElementById("timers").querySelectorAll("input");
  let arr = [].slice.call(inputs).map((node) => node.value);
  arr[0] = inputs[0].checked;
  if (isNumeric(arr[1]) && isNumeric(arr[2])) {
    browser.storage.local.set({ timers: arr });
    console.log(evictTime);
  } else alert("Please input numbers.");
}
async function restoreTimerDefaults() {
  let inputs = document.getElementById("timers").querySelectorAll("input");
  let defaults = await browser.storage.local.get("timers");
  defaults = defaults.timers;
  let i = -1;
  for (let inp of inputs) {
    inp.value = defaults[++i];
  }
  inputs[0].checked = defaults[0];
}

// =========== UTILS =============
function isNumeric(n) {
  return !isNaN(parseFloat(n)) && isFinite(n);
}
