# RequestOff

## What is RequestOff?

### Why would I use this?

## Todos

- Add a timer filtering mode
- Domain Filtering
- Aggressive Block Mode (Auto turn off requests and turn on during user interaction)
- Add a disk buffer in Local Storage
- Add a serialization method for LS -> in-memory

### Minor Todos

- Add Settings page
- Add a background thread to purge old off-line tabs that are no longer existent

## Completed

### 0.2.0

#### Added Features

- Add UI menu popup
- Add vim-mode
- Add auto scroll methods for vim-mode
- Window Filtering (via UI & shortcut)

#### Fixed Bugs

- Optimize onBeforeRequest to minimize overhead (Array => Set)
- Fix out of bounds vim arrow error
- Fix Tab Sync Error
