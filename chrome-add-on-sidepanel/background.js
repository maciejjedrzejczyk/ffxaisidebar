// Background script for Chrome extension
let sidebarWindowId = null;
let sidebarTabId = null;
let activeTabId = null;

// Function to create or focus the sidebar window
async function toggleSidebar() {
  if (sidebarWindowId) {
    // If sidebar exists, check if it's still open
    try {
      const sidebarWindow = await chrome.windows.get(sidebarWindowId);
      // If window exists, focus it
      chrome.windows.update(sidebarWindowId, { focused: true });
      return;
    } catch (e) {
      // Window doesn't exist anymore, reset the ID
      sidebarWindowId = null;
      sidebarTabId = null;
    }
  }

  // Get the current window to position the sidebar relative to it
  const currentWindow = await chrome.windows.getCurrent();
  
  // Create a narrow window for the sidebar
  const width = 400;
  const height = currentWindow.height;
  const left = currentWindow.left + currentWindow.width - width;
  const top = currentWindow.top;
  
  // Create the sidebar window
  const sidebarWindow = await chrome.windows.create({
    url: chrome.runtime.getURL('sidebar/sidebar.html'),
    type: 'popup',
    width: width,
    height: height,
    left: left,
    top: top
  });
  
  sidebarWindowId = sidebarWindow.id;
  sidebarTabId = sidebarWindow.tabs[0].id;
  
  // Update the active tab tracking
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tabs.length > 0) {
    activeTabId = tabs[0].id;
  }
}

// Toggle sidebar when toolbar button is clicked
chrome.action.onClicked.addListener(() => {
  toggleSidebar();
});

// Listen for tab changes to update the sidebar content
chrome.tabs.onActivated.addListener((activeInfo) => {
  console.log("Tab activated:", activeInfo.tabId);
  notifySidebarOfPageChange(activeInfo.tabId);
});

// Only use webNavigation if the API is available
if (chrome.webNavigation) {
  // Listen for navigation completion to update the sidebar
  chrome.webNavigation.onCompleted.addListener((details) => {
    if (details.frameId === 0) { // Main frame only
      console.log("Navigation completed:", details.tabId, details.url);
      notifySidebarOfPageChange(details.tabId);
    }
  });
}

// Helper function to notify sidebar of page changes
function notifySidebarOfPageChange(tabId) {
  if (!sidebarTabId) return;
  
  // Get tab info
  chrome.tabs.get(tabId).then((tab) => {
    // Notify the sidebar directly about the page change
    chrome.tabs.sendMessage(sidebarTabId, {
      action: "pageChanged",
      tabId: tab.id,
      url: tab.url,
      title: tab.title
    }).catch((error) => {
      console.log("Error sending message to sidebar:", error);
    });
    
    // Also try to notify via content script (as a backup)
    chrome.tabs.sendMessage(tabId, { action: "checkForSidebar" })
      .catch((error) => {
        console.log("Content script not ready in tab:", tabId, error);
      });
  }).catch((error) => {
    console.log("Error getting tab info:", error);
  });
}

// Listen for messages from sidebar
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Background received message:", message.action);
  
  if (message.action === "getPageContent") {
    // Get the active tab in the main window (not the sidebar)
    chrome.tabs.query({active: true, windowId: chrome.windows.WINDOW_ID_CURRENT})
      .then(tabs => {
        if (tabs.length === 0) {
          // Try getting any active tab if no tab is active in the current window
          return chrome.tabs.query({active: true});
        }
        return tabs;
      })
      .then(tabs => {
        if (tabs.length === 0) {
          sendResponse({ error: "No active tab found" });
          return;
        }
        
        // Don't try to inject into our own extension pages or chrome:// URLs
        const tabId = tabs[0].id;
        const url = tabs[0].url || "";
        
        if (url.startsWith("chrome-extension://") || 
            url.startsWith("chrome://") || 
            url.startsWith("edge://") || 
            url.startsWith("brave://")) {
          sendResponse({ 
            error: "Cannot access browser internal pages",
            title: tabs[0].title || "Browser Page",
            url: "Browser Internal Page",
            content: "This is a browser internal page that cannot be accessed by extensions for security reasons."
          });
          return;
        }
        
        // Execute script to get page content
        chrome.scripting.executeScript({
          target: { tabId: tabId },
          function: () => {
            return {
              title: document.title,
              url: window.location.href,
              content: document.body.innerText
            };
          }
        })
        .then(results => {
          if (results && results[0] && results[0].result) {
            sendResponse({ 
              title: results[0].result.title,
              url: results[0].result.url,
              content: results[0].result.content
            });
          } else {
            sendResponse({ error: "Failed to extract page content" });
          }
        })
        .catch(error => {
          console.error("Error getting page content:", error);
          sendResponse({ error: error.message || "Unknown error" });
        });
      })
      .catch(error => {
        console.error("Error in tab query:", error);
        sendResponse({ error: error.message || "Unknown error" });
      });
    
    return true; // Keep the message channel open for the async response
  }
  
  if (message.action === "tabClosed") {
    // Handle tab closed event
    return true;
  }
  
  return false;
});

// Track window closing to reset sidebar reference
chrome.windows.onRemoved.addListener((windowId) => {
  if (windowId === sidebarWindowId) {
    sidebarWindowId = null;
    sidebarTabId = null;
  }
});

// Store the active tab ID when tabs change
chrome.tabs.onActivated.addListener((activeInfo) => {
  // Don't update if this is our sidebar tab
  if (activeInfo.tabId !== sidebarTabId) {
    activeTabId = activeInfo.tabId;
  }
});

// Store the active tab ID when windows focus changes
chrome.windows.onFocusChanged.addListener((windowId) => {
  if (windowId !== chrome.windows.WINDOW_ID_NONE && windowId !== sidebarWindowId) {
    chrome.tabs.query({active: true, windowId: windowId})
      .then(tabs => {
        if (tabs.length > 0) {
          activeTabId = tabs[0].id;
        }
      });
  }
});
