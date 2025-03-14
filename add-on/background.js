// Toggle sidebar when toolbar button is clicked
browser.browserAction.onClicked.addListener(() => {
  browser.sidebarAction.toggle();
});

// Add this to your background.js
let activeTabId = null;

// Listen for tab changes to update the sidebar content
browser.tabs.onActivated.addListener((activeInfo) => {
  console.log("Tab activated:", activeInfo.tabId);
  notifySidebarOfPageChange(activeInfo.tabId);
});

// Listen for navigation completion to update the sidebar
browser.webNavigation.onCompleted.addListener((details) => {
  if (details.frameId === 0) { // Main frame only
    console.log("Navigation completed:", details.tabId, details.url);
    notifySidebarOfPageChange(details.tabId);
  }
});


// Helper function to notify sidebar of page changes
function notifySidebarOfPageChange(tabId) {
  // First check if sidebar is open
  browser.sidebarAction.isOpen({}).then((isOpen) => {
    if (isOpen) {
      // Get tab info
      browser.tabs.get(tabId).then((tab) => {
        // Notify the sidebar directly about the page change
        browser.runtime.sendMessage({
          action: "pageChanged",
          tabId: tab.id,
          url: tab.url,
          title: tab.title
        }).catch((error) => {
          console.log("Error sending message to sidebar:", error);
        });
        
        // Also try to notify via content script (as a backup)
        browser.tabs.sendMessage(tabId, { action: "checkForSidebar" })
          .catch((error) => {
            console.log("Content script not ready in tab:", tabId, error);
            // Inject content script if it's not already there
            browser.tabs.executeScript(tabId, {
              file: "content-script.js"
            }).catch((error) => {
              console.log("Failed to inject content script:", error);
            });
          });
      }).catch((error) => {
        console.log("Error getting tab info:", error);
      });
    }
  });
}

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
          title: results.title,
          url: results.url,
          content: results.content
        };
      })
      .catch(error => {
        console.error("Error getting page content:", error);
        return { error: error.message };
      });
  }
  return false;
});

// Add to background.js
browser.tabs.onRemoved.addListener((tabId) => {
  // Notify sidebar to remove this tab's context
  browser.runtime.sendMessage({ 
    action: "tabClosed", 
    tabId: tabId 
  });
});

// Add to sidebar.js
if (message.action === "tabClosed") {
  tabContexts.delete(message.tabId);
}

