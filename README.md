# RequestOff

## What is RequestOff?

### Why would I use this?

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
