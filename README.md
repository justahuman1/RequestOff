# RequestOff

## What is RequestOff?

Control what JavaScript executes on **your** web-browser! RequestOff allows you to load the initial JavaScript required to load single-page applications but disables all dynamic Javascript after the content is loaded.

### Why would I use this?

A good amount of users do not need all the interactivity provided by JavaScript (you would be surprised). While one could disable Javascript in the `about:config` section of a browser, this removes the control to allow JavaScript execution on certain tabs, for a certain moment of time.

RequestOff provides the user the control to disable JavaScript per tab, based on time, activity, or even DOM loading phases. This allows you to use *just* the right level of JS support that you require. No more pesky telemetry whenever your cursor moves!

## Todos

- Domain Filtering
- Aggressive Block Mode (Auto turn off requests and turn on during user interaction)
- Add a disk buffer in Local Storage
- Add a serialization method for LS -> in-memory

### Minor Todos

- Add a background thread to purge old off-line tabs that are no longer existent
- Add a 'No-Off' filter to prevent domains to not be impacted by requestOff

## Completed

## 0.1.11

- Add a timer filtering mode

### 0.1.10

- Bug Fixes (Separate Window State for UI)
- Close multiple tabs pointer jump bug

### 0.1.9

#### Added Features

- Add UI menu popup
- Add vim-mode
- Add auto scroll methods for vim-mode
- Window Filtering (via UI & shortcut)
- Add Settings page

#### Fixed Bugs

- Optimize onBeforeRequest to minimize overhead (Array => Set)
- Fix out of bounds vim arrow error
- Fix Tab Sync Error
