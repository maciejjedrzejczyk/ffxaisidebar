document.addEventListener('DOMContentLoaded', function() {
  // DOM elements
  const summaryElement = document.getElementById('summary');
  const statusElement = document.getElementById('status');
  const summarizeButton = document.getElementById('summarize-btn');
  const questionsButton = document.getElementById('questions-btn');
  const questionsContainer = document.getElementById('questions-container');
  const saveSettingsButton = document.getElementById('save-settings');
  const settingsToggle = document.getElementById('settings-toggle');
  const settingsContent = document.getElementById('settings-content');
  const toggleIcon = settingsToggle.querySelector('.toggle-icon');
  const chatMessages = document.getElementById('chat-messages');
  const chatInput = document.getElementById('chat-input');
  const chatSendButton = document.getElementById('chat-send');
  
  // Settings elements
  const endpointInput = document.getElementById('endpoint');
  const modelInput = document.getElementById('model');
  const maxLengthInput = document.getElementById('max-length');
  const systemPromptInput = document.getElementById('system-prompt');
  const autoSummarizeCheckbox = document.getElementById('auto-summarize');
  
  // Page content cache
  let currentPageContent = '';
  let currentPageTitle = '';
  let currentPageUrl = '';
  
  // Toggle settings panel
  settingsToggle.addEventListener('click', function() {
    settingsContent.classList.toggle('show');
    toggleIcon.classList.toggle('rotate');
  });
  
  // Load saved settings
  loadSettings();
  
  // Save settings
  saveSettingsButton.addEventListener('click', function() {
    const settings = {
      endpoint: endpointInput.value.trim(),
      model: modelInput.value.trim(),
      maxLength: parseInt(maxLengthInput.value, 10),
      systemPrompt: systemPromptInput.value.trim(),
      autoSummarize: autoSummarizeCheckbox.checked
    };
    
    browser.storage.local.set(settings).then(() => {
      updateStatus('Settings saved!');
      setTimeout(() => updateStatus('Ready'), 2000);
    });
  });
  
  // Summarize button
  summarizeButton.addEventListener('click', function() {
    summarizeCurrentPage();
  });
  
  // Questions button
  questionsButton.addEventListener('click', function() {
    generateQuestions();
  });
  
  // Chat send button
  chatSendButton.addEventListener('click', function() {
    sendChatMessage();
  });
  
  // Chat input enter key
  chatInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendChatMessage();
    }
  });
  
  // Listen for messages from background script
  browser.runtime.onMessage.addListener((message) => {
    if (message.action === "checkForSidebar") {
      // Update page content cache
      updatePageContentCache().then(() => {
        // Check if auto-summarize is enabled
        browser.storage.local.get('autoSummarize').then(result => {
          if (result.autoSummarize) {
            summarizeCurrentPage();
          } else {
            updateStatus('Page changed. Click "Summarize This Page" to generate a summary.');
          }
        });
      });
    }
    return false;
  });
  
  // Function to load settings
  function loadSettings() {
    browser.storage.local.get([
      'endpoint', 
      'model', 
      'maxLength', 
      'systemPrompt',
      'autoSummarize'
    ]).then((result) => {
      endpointInput.value = result.endpoint || 'http://localhost:11434';
      modelInput.value = result.model || 'llama3';
      maxLengthInput.value = result.maxLength || 6000;
      systemPromptInput.value = result.systemPrompt || 'You are a helpful assistant that summarizes web content concisely and accurately.';
      autoSummarizeCheckbox.checked = result.autoSummarize || false;
    });
  }
  
  // Function to update status
  function updateStatus(message) {
    statusElement.textContent = message;
  }
  
  // Function to update page content cache
  async function updatePageContentCache() {
    try {
      // Get active tab
      const tabs = await browser.tabs.query({active: true, currentWindow: true});
      
      // Extract text from page
      const results = await browser.tabs.executeScript(tabs[0].id, {
        code: `document.body.innerText`
      });
      
      currentPageContent = results[0];
      
      // Get page title and URL
      const pageInfo = await browser.tabs.get(tabs[0].id);
      currentPageTitle = pageInfo.title;
      currentPageUrl = pageInfo.url;
      
      return true;
    } catch (error) {
      console.error("Error updating page content cache:", error);
      return false;
    }
  }
  
  // Function to summarize current page
  async function summarizeCurrentPage() {
    updateStatus('Extracting page content...');
    summarizeButton.disabled = true;
    
    try {
      // Update cache if needed
      if (!currentPageContent) {
        await updatePageContentCache();
      }
      
      updateStatus('Sending to Ollama via proxy...');
      
      // Get settings
      const settings = await browser.storage.local.get([
        'endpoint', 
        'model', 
        'maxLength',
        'systemPrompt'
      ]);
      
      const endpoint = settings.endpoint || 'http://localhost:11434';
      const model = settings.model || 'llama3';
      const maxLength = settings.maxLength || 6000;
      const systemPrompt = settings.systemPrompt || 'You are a helpful assistant that summarizes web content concisely and accurately.';
      
      // Prepare the prompt
      const prompt = `${systemPrompt}
      
Please summarize the following webpage content concisely:
      
Title: ${currentPageTitle}
URL: ${currentPageUrl}

Content:
${currentPageContent.substring(0, maxLength)}

Summary:`;
      
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
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      } else {
        summaryElement.textContent = data.response;
        updateStatus('Summary generated successfully!');
      }
    } catch (error) {
      console.error("Error in summarize:", error);
      
      if (error.name === 'AbortError') {
        updateStatus('Error: Request timed out');
        summaryElement.textContent = "Request timed out after 90 seconds. The Ollama server might be busy or the model might be too large for the current request.";
      } else {
        updateStatus('Error: ' + error.message);
        summaryElement.textContent = `Failed to generate summary: ${error.message}`;
      }
    } finally {
      summarizeButton.disabled = false;
    }
  }
  
  // Function to generate questions about the page
  async function generateQuestions() {
    updateStatus('Generating questions...');
    questionsButton.disabled = true;
    questionsContainer.innerHTML = '';
    
    try {
      // Update cache if needed
      if (!currentPageContent) {
        await updatePageContentCache();
      }
      
      // Get settings
      const settings = await browser.storage.local.get([
        'endpoint', 
        'model', 
        'maxLength',
        'systemPrompt'
      ]);
      
      const endpoint = settings.endpoint || 'http://localhost:11434';
      const model = settings.model || 'llama3';
      const maxLength = settings.maxLength || 6000;
      const systemPrompt = settings.systemPrompt || 'You are a helpful assistant that summarizes web content concisely and accurately.';
      
      // Prepare the prompt
      const prompt = `${systemPrompt}
      
Based on the following webpage content, generate exactly 3 interesting questions that could be asked about this content. Format your response as a numbered list with just the questions, no additional text.
      
Title: ${currentPageTitle}
URL: ${currentPageUrl}

Content:
${currentPageContent.substring(0, maxLength)}

Questions:`;
      
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
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      } else {
        // Parse questions from response
        const questionsText = data.response;
        const questionLines = questionsText.split('\n')
          .map(line => line.trim())
          .filter(line => line.match(/^\d+[\.\)]\s+.+/) || line.match(/^[\-\*]\s+.+/));
        
        // Create buttons for each question
        questionLines.forEach((question, index) => {
          // Clean up the question text (remove numbering)
          const cleanQuestion = question.replace(/^[\d\.\)\-\*\s]+/, '').trim();
          
          const button = document.createElement('button');
          button.className = 'question-button';
          button.textContent = cleanQuestion;
          button.addEventListener('click', () => {
            // When clicked, ask this question in the chat
            chatInput.value = cleanQuestion;
            sendChatMessage();
          });
          
          questionsContainer.appendChild(button);
        });
        
        updateStatus('Questions generated!');
      }
    } catch (error) {
      console.error("Error generating questions:", error);
      
      if (error.name === 'AbortError') {
        updateStatus('Error: Request timed out');
      } else {
        updateStatus('Error: ' + error.message);
      }
    } finally {
      questionsButton.disabled = false;
    }
  }
  
  // Function to send a chat message
  async function sendChatMessage() {
    const userMessage = chatInput.value.trim();
    if (!userMessage) return;
    
    // Clear input
    chatInput.value = '';
    
    // Add user message to chat
    addMessageToChat('user', userMessage);
    
    // Show loading indicator
    const loadingMessage = addMessageToChat('assistant', 'Thinking...');
    
    try {
      // Update cache if needed
      if (!currentPageContent) {
        await updatePageContentCache();
      }
      
      // Get settings
      const settings = await browser.storage.local.get([
        'endpoint', 
        'model',
        'systemPrompt'
      ]);
      
      const endpoint = settings.endpoint || 'http://localhost:11434';
      const model = settings.model || 'llama3';
      const systemPrompt = settings.systemPrompt || 'You are a helpful assistant that summarizes web content concisely and accurately.';
      
      // Prepare the prompt
      const prompt = `${systemPrompt}
      
You are answering questions about the following webpage:

Title: ${currentPageTitle}
URL: ${currentPageUrl}

Content snippet:
${currentPageContent.substring(0, 3000)}

User question: ${userMessage}

Please provide a helpful, accurate, and concise answer based on the webpage content.`;
      
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
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      } else {
        // Remove loading message
        loadingMessage.remove();
        
        // Add assistant's response to chat
        addMessageToChat('assistant', data.response);
      }
    } catch (error) {
      console.error("Error in chat:", error);
      
      // Remove loading message
      loadingMessage.remove();
      
      if (error.name === 'AbortError') {
        addMessageToChat('assistant', "I'm sorry, but the request timed out. The server might be busy.");
      } else {
        addMessageToChat('assistant', `I'm sorry, but an error occurred: ${error.message}`);
      }
    }
  }
  
  // Function to add a message to the chat
  function addMessageToChat(role, text) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${role}-message`;
    
    const messageText = document.createElement('div');
    messageText.className = 'message-text';
    messageText.textContent = text;
    
    const messageTime = document.createElement('div');
    messageTime.className = 'message-time';
    messageTime.textContent = new Date().toLocaleTimeString();
    
    messageDiv.appendChild(messageText);
    messageDiv.appendChild(messageTime);
    
    chatMessages.appendChild(messageDiv);
    
    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    return messageDiv;
  }
  
  // Initialize by checking if we need to update the page content cache
  updatePageContentCache();
});