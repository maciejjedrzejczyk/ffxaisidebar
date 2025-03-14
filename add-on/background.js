// Toggle sidebar when toolbar button is clicked
browser.browserAction.onClicked.addListener(() => {
  browser.sidebarAction.toggle();
});

// Listen for tab changes to update the sidebar content
browser.tabs.onActivated.addListener((activeInfo) => {
  browser.sidebarAction.isOpen({}).then((isOpen) => {
    if (isOpen) {
      browser.tabs.sendMessage(activeInfo.tabId, { action: "checkForSidebar" })
        .catch(() => {
          // Tab doesn't have content script yet, do nothing
        });
    }
  });
});

// Listen for navigation completion to update the sidebar
browser.webNavigation.onCompleted.addListener((details) => {
  if (details.frameId === 0) { // Main frame only
    browser.sidebarAction.isOpen({}).then((isOpen) => {
      if (isOpen) {
        browser.tabs.sendMessage(details.tabId, { action: "checkForSidebar" })
          .catch(() => {
            // Tab doesn't have content script yet, do nothing
          });
      }
    });
  }
});

// Listen for messages from sidebar
browser.runtime.onMessage.addListener((message, sender) => {
  if (message.action === "getPageContent") {
    return browser.tabs.query({active: true, currentWindow: true})
      .then(tabs => {
        return browser.tabs.executeScript(tabs[0].id, {
          code: `{
            title: document.title,
            url: window.location.href,
            content: document.body.innerText
          }`
        });
      })
      .then(results => {
        return { 
          title: results[0].title,
          url: results[0].url,
          content: results[0].content
        };
      })
      .catch(error => {
        console.error("Error getting page content:", error);
        return { error: error.message };
      });
  }
  return false;
});