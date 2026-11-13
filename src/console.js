(function () {
  const HOST = /^(\d{12})-([a-z0-9]+)\./i;

  function readRole() {
    const raw = document.querySelector('meta[content*="sessionARN"]')?.getAttribute("content");
    try {
      const arn = JSON.parse(raw).sessionARN;
      return arn.split("/")[1]?.match(/^AWSReservedSSO_(.+)_[0-9a-f]{16}$/)?.[1];
    } catch {
      return undefined;
    }
  }

  async function sync() {
    const host = location.hostname.match(HOST);
    const role = readRole();
    if (!host || !role) {
      return;
    }
    const key = `${host[1]}|${host[2]}`;
    const { sessionRoles = {} } = await chrome.storage.local.get("sessionRoles");
    if (sessionRoles[key] === role) {
      return;
    }
    await chrome.storage.local.set({ sessionRoles: { ...sessionRoles, [key]: role } });
  }

  sync();
  new MutationObserver(sync).observe(document.head, { childList: true, subtree: true });
})();
