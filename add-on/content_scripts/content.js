// Listen for messages from popup
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "getSummary") {
      // Extract text from the webpage
      const textContent = extractMainContent();
      
      // Send text to background script for summarization
      browser.runtime.sendMessage({
        action: "summarizeText",
        text: textContent
      });
      
      // Respond immediately (don't use Promise here)
      sendResponse({ success: true });
      return false; // We're not sending a response asynchronously
    }
    return false; // Not handling this message
  });
  
  // Function to extract main content from webpage
  function extractMainContent() {
    // Try to get content from article or main elements first
    let content = '';
    const mainElements = document.querySelectorAll('article, main, [role="main"]');
    
    if (mainElements.length > 0) {
      for (const element of mainElements) {
        content += element.innerText + '\n';
      }
    } else {
      // Fallback to paragraphs if no main content elements found
      const paragraphs = document.querySelectorAll('p');
      for (const p of paragraphs) {
        if (p.innerText.length > 20) { // Filter out short paragraphs
          content += p.innerText + '\n';
        }
      }
    }
    
    // If still no content, get all text
    if (content.trim() === '') {
      content = document.body.innerText;
    }
    
    // Limit content length to avoid overwhelming the model
    return content.substring(0, 8000);
  }