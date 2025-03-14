document.addEventListener('DOMContentLoaded', function() {
    // Load saved settings
    browser.storage.local.get(['endpoint', 'model']).then((result) => {
      document.getElementById('endpoint').value = result.endpoint || 'http://localhost:11434';
      document.getElementById('model').value = result.model || 'llama3';
    });
  
    // Save settings
    document.getElementById('save-settings').addEventListener('click', function() {
      const endpoint = document.getElementById('endpoint').value.trim();
      const model = document.getElementById('model').value.trim();
      
      browser.storage.local.set({
        endpoint: endpoint,
        model: model
      }).then(() => {
        alert('Settings saved!');
      });
    });
  
    // Summarize button
    document.getElementById('summarize').addEventListener('click', async function() {
      const summaryElement = document.getElementById('summary');
      summaryElement.textContent = 'Extracting page content...';
      
      try {
        // Get page content
        const tabs = await browser.tabs.query({active: true, currentWindow: true});
        const results = await browser.tabs.executeScript(tabs[0].id, {
          code: `document.body.innerText`
        });
        
        const pageText = results[0];
        summaryElement.textContent = 'Sending to Ollama via proxy...';
        
        // Get settings
        const settings = await browser.storage.local.get(['endpoint', 'model']);
        const endpoint = settings.endpoint || 'http://localhost:11434';
        const model = settings.model || 'llama3';
        
        // Prepare the prompt
        const prompt = `Please summarize the following webpage content concisely:
        
  ${pageText.substring(0, 6000)}
  
  Summary:`;
        
        console.log("Sending request to proxy...");
        
        // Set up timeout for fetch
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 90000); // 90 second timeout
        
        // Use the proxy
        const response = await fetch('http://localhost:8765', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            endpoint: endpoint,
            model: model,
            prompt: prompt
          }),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        console.log("Received response from proxy");
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.error) {
          summaryElement.textContent = `Error: ${data.error}`;
          if (data.details) {
            console.error("Error details:", data.details);
          }
        } else {
          summaryElement.textContent = data.response;
        }
      } catch (error) {
        console.error("Error in summarize:", error);
        
        if (error.name === 'AbortError') {
          summaryElement.textContent = "Error: Request timed out after 90 seconds. The Ollama server might be busy or the model might be too large for the current request.";
        } else {
          summaryElement.textContent = `Error: ${error.message || "Failed to communicate with proxy server"}`;
        }
      }
    });
  });