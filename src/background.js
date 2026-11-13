const CONSOLE_URL = /^https:\/\/(\d{12})-[a-z0-9]+\.[a-z0-9-]+\.console\.aws\.amazon\.com\//i;
const CONSOLE_QUERY = { url: ["https://*.console.aws.amazon.com/*"] };
const PALETTE = ["blue", "red", "yellow", "green", "pink", "purple", "cyan", "grey"];

let queue = Promise.resolve();

function enqueue(task) {
  queue = queue.then(task).catch((error) => console.error(error));
  return queue;
}

function colorFor(accountId) {
  let hash = 0;
  for (const char of accountId) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  return PALETTE[hash % PALETTE.length];
}

async function groupTab(tab) {
  const accountId = tab.url?.match(CONSOLE_URL)?.[1];
  if (!accountId) {
    return;
  }
  const { accountNames = {} } = await chrome.storage.local.get("accountNames");
  const title = accountNames[accountId] ?? accountId;
  const [existing] = await chrome.tabGroups.query({ windowId: tab.windowId, title });
  if (existing) {
    if (tab.groupId !== existing.id) {
      await chrome.tabs.group({ groupId: existing.id, tabIds: tab.id });
    }
    return;
  }
  const [unnamed] = await chrome.tabGroups.query({ windowId: tab.windowId, title: accountId });
  if (unnamed) {
    await chrome.tabGroups.update(unnamed.id, { title });
    if (tab.groupId !== unnamed.id) {
      await chrome.tabs.group({ groupId: unnamed.id, tabIds: tab.id });
    }
    return;
  }
  const groupId = await chrome.tabs.group({ tabIds: tab.id });
  await chrome.tabGroups.update(groupId, { title, color: colorFor(accountId) });
}

async function groupAllConsoleTabs() {
  const tabs = await chrome.tabs.query(CONSOLE_QUERY);
  for (const tab of tabs) {
    await enqueue(() => groupTab(tab));
  }
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url || changeInfo.status === "complete") {
    enqueue(() => groupTab(tab));
  }
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.accountNames) {
    groupAllConsoleTabs();
  }
});

chrome.runtime.onInstalled.addListener(groupAllConsoleTabs);
chrome.runtime.onStartup.addListener(groupAllConsoleTabs);
chrome.action.onClicked.addListener(groupAllConsoleTabs);
