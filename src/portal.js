(function () {
  const ACCOUNT_ROW = 'tr[data-selection-item="item"][aria-level="1"]';
  let lastSnapshot = "";

  function readAccounts() {
    const accounts = {};
    for (const row of document.querySelectorAll(ACCOUNT_ROW)) {
      const href = row.querySelector('a[href*="account_id="]')?.getAttribute("href") ?? "";
      const accountId = href.match(/account_id=(\d{12})/)?.[1];
      const name = row.querySelector("th")?.innerText.trim();
      if (accountId && name) {
        accounts[accountId] = name;
      }
    }
    return accounts;
  }

  async function sync() {
    const accounts = readAccounts();
    const snapshot = JSON.stringify(accounts);
    if (Object.keys(accounts).length === 0 || snapshot === lastSnapshot) {
      return;
    }
    lastSnapshot = snapshot;
    const { accountNames = {} } = await chrome.storage.local.get("accountNames");
    await chrome.storage.local.set({ accountNames: { ...accountNames, ...accounts } });
  }

  sync();
  new MutationObserver(sync).observe(document.body, { childList: true, subtree: true });
})();
