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

browser.tabs.onCreated.addListener((i) => {
  console.log(i);
});
