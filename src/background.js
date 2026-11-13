const CONSOLE_URL = /^https:\/\/(\d{12})-([a-z0-9]+)\.[a-z0-9-]+\.console\.aws\.amazon\.com\//i;
const CONSOLE_QUERY = { url: ["https://*.console.aws.amazon.com/*"] };
const PALETTE = ["blue", "red", "yellow", "green", "pink", "purple", "cyan", "grey"];

let queue = Promise.resolve();

function enqueue(task) {
  queue = queue.then(task).catch((error) => console.error(error));
  return queue;
}

function colorFor(key) {
  let hash = 0;
  for (const char of key) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  return PALETTE[hash % PALETTE.length];
}

async function regroupAll() {
  const { accountNames = {} } = await chrome.storage.local.get("accountNames");
  const tabs = await chrome.tabs.query(CONSOLE_QUERY);

  const sessionsByAccount = {};
  const tabsBySession = {};
  for (const tab of tabs) {
    const match = tab.url?.match(CONSOLE_URL);
    if (!match) {
      continue;
    }
    const [, accountId, session] = match;
    (sessionsByAccount[accountId] ??= new Set()).add(session);
    const key = `${accountId}|${session}`;
    (tabsBySession[key] ??= []).push(tab);
  }

  const claimed = new Set();
  for (const [key, sessionTabs] of Object.entries(tabsBySession)) {
    const [accountId, session] = key.split("|");
    const name = accountNames[accountId] ?? accountId;
    const title = sessionsByAccount[accountId].size > 1 ? `${name} · ${session}` : name;
    const tabIds = sessionTabs.map((tab) => tab.id);
    const windowId = sessionTabs[0].windowId;

    const current = sessionTabs.find((tab) => tab.groupId !== -1 && !claimed.has(tab.groupId));
    let groupId = current?.groupId;
    if (groupId === undefined) {
      for (const candidate of [title, name, `${name} · ${session}`]) {
        const [existing] = (await chrome.tabGroups.query({ windowId, title: candidate })).filter((g) => !claimed.has(g.id));
        if (existing) {
          groupId = existing.id;
          break;
        }
      }
    }
    if (groupId !== undefined) {
      claimed.add(groupId);
    }

    if (groupId === undefined) {
      groupId = await chrome.tabs.group({ tabIds });
      await chrome.tabGroups.update(groupId, { title, color: colorFor(key) });
    } else {
      await chrome.tabs.group({ groupId, tabIds });
      await chrome.tabGroups.update(groupId, { title });
    }
    claimed.add(groupId);
  }
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url || changeInfo.status === "complete") {
    enqueue(regroupAll);
  }
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.accountNames) {
    enqueue(regroupAll);
  }
});

chrome.runtime.onInstalled.addListener(() => enqueue(regroupAll));
chrome.runtime.onStartup.addListener(() => enqueue(regroupAll));
chrome.action.onClicked.addListener(() => enqueue(regroupAll));
