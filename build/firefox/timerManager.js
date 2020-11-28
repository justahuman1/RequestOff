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

// If timer-off mode is enabled, register listener.
// If turned off, deregister listener.
let timerInterval;
async function timerUpdate(timers) {
  clearInterval(timerInterval);
  if (timers[0]) timerEnable(Number(timers[1]), Number(timers[2]));
}
function timerEnable(pollTime, evictTime) {
  timerInterval = setInterval(() => {
    browser.tabs.query({ currentWindow: true }).then((tabs) => {
      for (let tab of tabs)
        if (
          !tab.active && // Not active
          !inMemoryStorage.has(tab.id) && // Not already offline
          !excludedTabs.has(tab.id) && // Not in excluded set
          unixTime(new Date().getTime()) - unixTime(tab.lastAccessed) >
            evictTime
          // Add a URL filter
        )
          sendOfflineMessage(tab.id);
    });
  }, pollTime * 1000);
}
function unixTime(epochTimestamp) {
  return (epochTimestamp / 1000) | 0;
}
