// This script will be injected into web pages
console.log("Sidekick content script loaded");

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Content script received message:", message);
  
  if (message.action === "checkForSidebar") {
    // Notify the sidebar that the page has changed
    chrome.runtime.sendMessage({ 
      action: "pageChanged",
      url: window.location.href,
      title: document.title
    }).then(() => {
      console.log("Sent pageChanged message to sidebar");
    }).catch((error) => {
      console.log("Error sending pageChanged message:", error);
    });
  }
  return false;
});

// Also notify on initial load
chrome.runtime.sendMessage({ 
  action: "pageChanged",
  url: window.location.href,
  title: document.title
}).catch((error) => {
  console.log("Error sending initial pageChanged message:", error);
});
