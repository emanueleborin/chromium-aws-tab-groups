const CONSOLE_URL = /^https:\/\/(\d{12})-([a-z0-9]+)\.[a-z0-9-]+\.console\.aws\.amazon\.com\//i;
const CONSOLE_QUERY = { url: ["https://*.console.aws.amazon.com/*"] };
const PALETTE = ["blue", "red", "yellow", "green", "pink", "purple", "cyan", "grey"];

let queue = Promise.resolve();

function enqueue(task) {
  queue = queue.then(task).catch((error) => console.error(error));
  return queue;
}

function pickColor(used) {
  return PALETTE.find((color) => !used.has(color)) ?? PALETTE[used.size % PALETTE.length];
}

function sessionLabel(accountId, session, sessions, roles) {
  const role = roles[`${accountId}|${session}`];
  if (!role) {
    return session;
  }
  const sameRole = sessions.filter((other) => roles[`${accountId}|${other}`] === role);
  return sameRole.length > 1 ? `${role} ${sameRole.indexOf(session) + 1}` : role;
}

async function regroupAll() {
  const { accountNames = {}, sessionRoles = {} } = await chrome.storage.local.get(["accountNames", "sessionRoles"]);
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
  const used = new Set();
  for (const [key, sessionTabs] of Object.entries(tabsBySession)) {
    const [accountId, session] = key.split("|");
    const name = accountNames[accountId] ?? accountId;
    const sessions = [...sessionsByAccount[accountId]].sort();
    const title = sessions.length > 1 ? `${name} · ${sessionLabel(accountId, session, sessions, sessionRoles)}` : name;
    const tabIds = sessionTabs.map((tab) => tab.id);
    const windowId = sessionTabs[0].windowId;

    const current = sessionTabs.find((tab) => tab.groupId !== -1 && !claimed.has(tab.groupId));
    let groupId = current?.groupId;
    if (groupId === undefined) {
      for (const candidate of [title, name]) {
        const [existing] = (await chrome.tabGroups.query({ windowId, title: candidate })).filter((g) => !claimed.has(g.id));
        if (existing) {
          groupId = existing.id;
          break;
        }
      }
    }

    if (groupId === undefined) {
      groupId = await chrome.tabs.group({ tabIds });
      const color = pickColor(used);
      used.add(color);
      await chrome.tabGroups.update(groupId, { title, color });
    } else {
      await chrome.tabs.group({ groupId, tabIds });
      const { color } = await chrome.tabGroups.get(groupId);
      const next = used.has(color) ? pickColor(used) : color;
      used.add(next);
      await chrome.tabGroups.update(groupId, { title, color: next });
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
  if (area === "local" && (changes.accountNames || changes.sessionRoles)) {
    enqueue(regroupAll);
  }
});

chrome.runtime.onInstalled.addListener(() => enqueue(regroupAll));
chrome.runtime.onStartup.addListener(() => enqueue(regroupAll));
chrome.action.onClicked.addListener(() => enqueue(regroupAll));
