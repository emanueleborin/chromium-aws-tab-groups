# chromium-aws-tab-groups

Chromium extension (Manifest V3) that automatically groups AWS console tabs by account. Works on Chrome, Edge, Brave and other Chromium-based browsers.

## How it works

- On the IAM Identity Center portal (`*.awsapps.com/start`) it reads the account list and stores the `account ID → name` map in `chrome.storage.local`. The map stays in your browser profile and is not in the repo.
- When an AWS console tab (`<account>-<session>.<region>.console.aws.amazon.com`) is opened or its URL changes, it moves the tab into the group for its session. If the group does not exist, it creates it.
- If the account is not in the map, the group uses the account ID instead of the name.
- On install, on browser startup and on a click on the extension icon, it also groups the tabs that are already open.

## Installation (development)

1. Open `brave://extensions` (or `chrome://extensions`).
2. Enable "Developer mode".
3. Click "Load unpacked" and select this repo's folder.

After each code change, reload the extension from the same page.

## Grouping

Each console session has its own group, with a different color. The title is the account name. If the account has more than one open session, the title adds the permission set (e.g. `AWSAdministratorAccess`) read from the console page (`src/console.js`). If two sessions of the same account have the same permission set, the title adds a number.
