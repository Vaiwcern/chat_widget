chrome.runtime.onMessage.addListener((msg, sender) => {
    if (msg.type === "OPEN_PANEL" && sender.tab?.id) {
        chrome.sidePanel.open({ tabId: sender.tab.id });
    }
});
