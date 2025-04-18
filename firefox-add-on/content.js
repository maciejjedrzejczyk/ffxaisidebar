// This script will be injected into web pages
// Listen for messages from the background script
browser.runtime.onMessage.addListener((message) => {
    if (message.action === "checkForSidebar") {
      // Notify the sidebar that the page has changed
      browser.runtime.sendMessage({ 
        action: "pageChanged",
        url: window.location.href,
        title: document.title
      });
    }
    return false;
  });