// User option for timer to move tab offline
// Add tab-id to a dictionary with timestamp { tabId: epoch }
// Poll tabs ever x seconds -> Let x be defined by the user
//   If now - epoch is greater than x, add tabId to offline
// Exceptions:
//   - Do not add the current active tab
//   - Reset poll when tabId is visited?

// UI
//   Show next poll time in the UI?
//   Let user run poll on command -> button

const pollTime = 5;
const evictTime = 30;
let timerInterval;

// If timer-off mode is enabled, register listener.
// If turned off, deregister listener.

async function timerUpdate() {
  clearInterval(timerInterval);
  let timers = (await browser.storage.local.get("timers")).timers;
  if (timers[0] == "true") console.log(timers);
  console.log(timers);
  timerEnable(Number(timers[1]), Number(timers[2]));
}
function timerEnable(pollTime, evictTime) {
  timerInterval = setInterval(() => {
    browser.tabs.query({ currentWindow: true }).then((tabs) => {
      for (let tab of tabs)
        if (
          currentUnixTime() - ((tab.lastAccessed / 1000) | 0) > evictTime &&
          !tab.active &&
          !inMemoryStorage.has(tab.id)
        )
          sendOfflineMessage(tab.id);
    });
  }, pollTime * 1000);
}

function currentUnixTime() {
  return (new Date().getTime() / 1000) | 0;
}
timerUpdate();
