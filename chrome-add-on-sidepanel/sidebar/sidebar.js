document.addEventListener('DOMContentLoaded', function() {
  // DOM elements
  console.log("Sidebar DOM loaded");
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
  const maxTokensInput = document.getElementById('max-tokens');
  const systemPromptInput = document.getElementById('system-prompt');
  const autoSummarizeCheckbox = document.getElementById('auto-summarize');
  const tabContexts = new Map();
  
  // Page content cache
  let currentPageTitle = '';
  let currentPageUrl = '';
  let currentPageContent = null;
  let currentTokenCount = 0;
  
  // Toggle settings panel
  settingsToggle.addEventListener('click', function() {
    settingsContent.classList.toggle('show');
    toggleIcon.classList.toggle('rotate');
  });

  const resetButton = document.getElementById('reset-conversation');
  if (resetButton) {
    resetButton.addEventListener('click', resetConversation);
  }
  
  // Load saved settings
  loadSettings();
  
  // Save settings
  saveSettingsButton.addEventListener('click', function() {
    const settings = {
      endpoint: endpointInput.value.trim(),
      model: modelInput.value.trim(),
      maxTokens: parseInt(maxTokensInput.value, 10),
      systemPrompt: systemPromptInput.value.trim(),
      autoSummarize: autoSummarizeCheckbox.checked
    };
    
    chrome.storage.local.set(settings).then(() => {
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
  
  // Save context for current tab
  function saveTabContext(tabId) {
    const context = {
      messages: document.querySelector('.chat-messages').innerHTML,
      questions: document.querySelector('.questions-container')?.innerHTML || '',
      pageContent: currentPageContent,
      pageTitle: currentPageTitle,
      pageUrl: currentPageUrl,
      tokenCount: currentTokenCount
    };
    
    tabContexts.set(tabId, context);
  }

  // Load context for a tab
  function loadTabContext(tabId) {
    const context = tabContexts.get(tabId);
    
    if (context) {
      // Restore the saved context
      document.querySelector('.chat-messages').innerHTML = context.messages;
      if (document.querySelector('.questions-container')) {
        document.querySelector('.questions-container').innerHTML = context.questions;
      }
      
      currentPageContent = context.pageContent;
      currentPageTitle = context.pageTitle;
      currentPageUrl = context.pageUrl;
      currentTokenCount = context.tokenCount || 0;
      
      if (currentTokenCount > 0) {
        updateStatus(`Ready | Input: ${currentTokenCount} tokens`);
      } else {
        updateStatus('Ready');
      }
      
      return true;
    }
    
    return false; // No saved context
  }

  // Listen for messages from background script or content script
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("Sidebar received message:", message);
    
    if (message.action === "pageChanged") {
      console.log("Page changed to:", message.url);
      
      // Reset conversation for the new page
      resetConversation();
      
      // Update page content cache
      setTimeout(() => {
        updatePageContentCache().then(() => {
          updateStatus("Ready");
          // Check if auto-summarize is enabled
          chrome.storage.local.get('autoSummarize').then(result => {
            if (result.autoSummarize) {
              summarizeCurrentPage();
            }
          });
        });
      }, 500); // Small delay to ensure page is fully loaded
    }
    return false;
  });

  // Function to clear the tab context
  function clearTabContext() {
    // Clear chat messages
    const chatMessages = document.querySelector('.chat-messages');
    if (chatMessages) {
      chatMessages.innerHTML = '';
    }
    
    // Clear the chat input field
    const chatInput = document.getElementById('chat-input');
    if (chatInput) {
      chatInput.value = '';
    }
    
    // Clear suggested questions
    const questionsContainer = document.querySelector('.questions-container');
    if (questionsContainer) {
      questionsContainer.innerHTML = '';
    }
    
    // Clear any conversation history or context variables you might have
    currentPageContent = null;
    currentPageTitle = '';
    currentPageUrl = '';
    
    // Add a welcome message to the chat
    addMessageToChat('assistant', 'Welcome to Sidekick! Click "Summarize This Page" to get started, or ask me a question about the current page.');
  }
  
  // Function to load settings
  function loadSettings() {
    chrome.storage.local.get([
      'endpoint', 
      'model',
      'maxTokens',
      'systemPrompt',
      'autoSummarize'
    ]).then((result) => {
      endpointInput.value = result.endpoint || 'http://localhost:11434';
      modelInput.value = result.model || 'llama3';
      maxTokensInput.value = result.maxTokens || 8000;
      systemPromptInput.value = result.systemPrompt || 'You are a helpful assistant that summarizes web content concisely and accurately.';
      autoSummarizeCheckbox.checked = result.autoSummarize || false;
    });
  }

  // Function to reset the conversation
  function resetConversation() {
    // Clear the chat messages container
    const chatMessages = document.querySelector('.chat-messages');
    if (chatMessages) {
      chatMessages.innerHTML = '';
    }
  
    // Clear the chat input field
    const chatInput = document.getElementById('chat-input');
    if (chatInput) {
      chatInput.value = '';
    }
  
    // Clear suggested questions
    const questionsContainer = document.querySelector('.questions-container');
    if (questionsContainer) {
      questionsContainer.innerHTML = '';
    }
  
    // Clear any conversation history or context variables
    currentPageContent = null;
    currentPageTitle = '';
    currentPageUrl = '';
    currentTokenCount = 0;
  
    // Update page content cache
    updatePageContentCache().then(() => {
      // Add a welcome message to the chat
      addMessageToChat('assistant', 'Welcome to Sidekick! Click "Summarize This Page" to get started, or ask me a question about the current page.');
    });
  }

  // Function to estimate token count
  function estimateTokenCount(text) {
    if (!text) return 0;
    // A rough estimate: 1 token is approximately 4 characters for English text
    return Math.ceil(text.length / 4);
  }

  // Function to update page content cache
  async function updatePageContentCache() {
    try {
      console.log("Updating page content cache...");
      
      // Send message to background script to get active tab content
      return new Promise((resolve) => {
        chrome.runtime.sendMessage({ action: "getPageContent" }, (response) => {
          if (chrome.runtime.lastError) {
            console.error("Runtime error:", chrome.runtime.lastError);
            updateStatus("Error: " + chrome.runtime.lastError.message);
            resolve(false);
            return;
          }
          
          if (response && !response.error) {
            currentPageContent = response.content;
            currentPageTitle = response.title;
            currentPageUrl = response.url;
            
            // Calculate token count
            currentTokenCount = estimateTokenCount(currentPageContent);
            
            console.log("Page content updated:", {
              title: currentPageTitle,
              url: currentPageUrl,
              contentLength: currentPageContent ? currentPageContent.length : 0,
              tokenCount: currentTokenCount
            });
            
            // Update status with token count
            updateStatus(`Ready | Input: ${currentTokenCount} tokens`);
            
            resolve(true);
          } else {
            console.error("Error getting page content:", response?.error || "Unknown error");
            updateStatus("Error loading page content: " + (response?.error || "Unknown error"));
            
            // Even with an error, we might have received some content
            if (response && response.title) {
              currentPageTitle = response.title;
              currentPageUrl = response.url || "Unknown URL";
              currentPageContent = response.content || "No content available";
              currentTokenCount = estimateTokenCount(currentPageContent);
              resolve(true);
            } else {
              resolve(false);
            }
          }
        });
      });
    } catch (error) {
      console.error("Error updating page content:", error);
      updateStatus("Error loading page content: " + error.message);
      return false;
    }
  }

  // Function to summarize current page
  async function summarizeCurrentPage() {
    updateStatus(`Processing | Input: ${currentTokenCount} tokens`);
    summarizeButton.disabled = true;
    
    try {
      // Update cache if needed
      if (!currentPageContent) {
        const success = await updatePageContentCache();
        if (!success || !currentPageContent) {
          throw new Error("Failed to load page content. Please try again.");
        }
      }
      
      // Safety check for null content
      if (!currentPageContent) {
        throw new Error("Page content is empty or unavailable");
      }
      
      updateStatus(`Sending to Ollama | Input: ${currentTokenCount} tokens`);
      
      // Get settings
      const settings = await chrome.storage.local.get([
        'endpoint', 
        'model',
        'maxTokens',
        'systemPrompt'
      ]);
      
      const endpoint = settings.endpoint || 'http://localhost:11434';
      const model = settings.model || 'llama3';
      const maxTokens = settings.maxTokens || 8000;
      const systemPrompt = settings.systemPrompt || 'You are a helpful assistant that summarizes web content concisely and accurately.';
      
      // Prepare the prompt with safety checks
      const safeTitle = currentPageTitle || "Untitled Page";
      const safeUrl = currentPageUrl || "No URL available";
      const safeContent = currentPageContent || "No content available";
      
      // Add a user message to the chat indicating a summary was requested
      addMessageToChat('user', `Please summarize this page: ${safeTitle}`);
      
      // Add a loading message that will be replaced with the actual summary
      const loadingMessage = addMessageToChat('assistant', 'Generating summary...');
      
      // Calculate optimal content length based on token count
      // For very large pages, we'll use a sliding window approach
      let contentToSend = safeContent;
      let actualInputTokens = currentTokenCount;
      
      if (currentTokenCount > maxTokens) {
        // If content is too large, take the first part and a sample from the middle and end
        const firstPart = Math.floor(maxTokens * 0.6); // 60% from the beginning
        const middlePart = Math.floor(maxTokens * 0.2); // 20% from the middle
        const lastPart = Math.floor(maxTokens * 0.2); // 20% from the end
        
        const firstSection = safeContent.substring(0, firstPart * 4); // Convert tokens to chars
        
        const middleStart = Math.floor(safeContent.length / 2) - (middlePart * 2);
        const middleSection = safeContent.substring(middleStart, middleStart + (middlePart * 4));
        
        const lastStart = safeContent.length - (lastPart * 4);
        const lastSection = safeContent.substring(lastStart);
        
        contentToSend = `${firstSection}\n\n[...content truncated...]\n\n${middleSection}\n\n[...content truncated...]\n\n${lastSection}`;
        actualInputTokens = maxTokens;
        
        updateStatus(`Processing | Input: ${maxTokens} tokens (truncated from ${currentTokenCount})`);
      }
      
      const prompt = `${systemPrompt}
      
Please summarize the following webpage content concisely:
      
Title: ${safeTitle}
URL: ${safeUrl}

Content:
${contentToSend}

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
        // Replace the loading message with the actual summary
        loadingMessage.textContent = data.response;
        
        // Calculate response tokens
        const responseTokens = estimateTokenCount(data.response);
        updateStatus(`Ready | Input: ${actualInputTokens} tokens | Output: ${responseTokens} tokens`);
      }
    } catch (error) {
      console.error("Error in summarize:", error);
      
      if (error.name === 'AbortError') {
        updateStatus('Error: Request timed out');
        loadingMessage.textContent = "Request timed out after 90 seconds. The Ollama server might be busy or the model might be too large for the current request.";
      } else {
        updateStatus('Error: ' + error.message);
        loadingMessage.textContent = `Failed to generate summary: ${error.message}`;
      }
    } finally {
      summarizeButton.disabled = false;
    }
  }
  
  // Function to generate questions about the page
  async function generateQuestions() {
    updateStatus(`Processing | Input: ${currentTokenCount} tokens`);
    questionsButton.disabled = true;
    questionsContainer.innerHTML = '';
    
    try {
      // Update cache if needed
      if (!currentPageContent) {
        const success = await updatePageContentCache();
        if (!success || !currentPageContent) {
          throw new Error("Failed to load page content. Please try again.");
        }
      }
      
      // Safety check for null content
      if (!currentPageContent) {
        throw new Error("Page content is empty or unavailable");
      }
      
      // Get settings
      const settings = await chrome.storage.local.get([
        'endpoint', 
        'model',
        'maxTokens',
        'systemPrompt'
      ]);
      
      const endpoint = settings.endpoint || 'http://localhost:11434';
      const model = settings.model || 'llama3';
      const maxTokens = settings.maxTokens || 8000;
      const systemPrompt = settings.systemPrompt || 'You are a helpful assistant that summarizes web content concisely and accurately.';
      
      // Prepare the prompt with safety checks
      const safeTitle = currentPageTitle || "Untitled Page";
      const safeUrl = currentPageUrl || "No URL available";
      const safeContent = currentPageContent || "No content available";
      
      // Add a user message to the chat indicating questions were requested
      addMessageToChat('user', `What are some interesting questions about this page?`);
      
      // Add a loading message that will be replaced with the actual questions
      const loadingMessage = addMessageToChat('assistant', 'Generating questions...');
      
      // Calculate optimal content length based on token count
      // For very large pages, we'll use a sliding window approach
      let contentToSend = safeContent;
      let actualInputTokens = currentTokenCount;
      
      if (currentTokenCount > maxTokens) {
        // If content is too large, take the first part and a sample from the middle and end
        const firstPart = Math.floor(maxTokens * 0.6); // 60% from the beginning
        const middlePart = Math.floor(maxTokens * 0.2); // 20% from the middle
        const lastPart = Math.floor(maxTokens * 0.2); // 20% from the end
        
        const firstSection = safeContent.substring(0, firstPart * 4); // Convert tokens to chars
        
        const middleStart = Math.floor(safeContent.length / 2) - (middlePart * 2);
        const middleSection = safeContent.substring(middleStart, middleStart + (middlePart * 4));
        
        const lastStart = safeContent.length - (lastPart * 4);
        const lastSection = safeContent.substring(lastStart);
        
        contentToSend = `${firstSection}\n\n[...content truncated...]\n\n${middleSection}\n\n[...content truncated...]\n\n${lastSection}`;
        actualInputTokens = maxTokens;
        
        updateStatus(`Processing | Input: ${maxTokens} tokens (truncated from ${currentTokenCount})`);
      }
      
      const prompt = `${systemPrompt}
      
Based on the following webpage content, generate exactly 3 interesting questions that could be asked about this content. Format your response as a numbered list with just the questions, no additional text.
      
Title: ${safeTitle}
URL: ${safeUrl}

Content:
${contentToSend}

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
        // Replace loading message with the actual response
        loadingMessage.textContent = data.response;
        
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
        
        // Calculate response tokens
        const responseTokens = estimateTokenCount(data.response);
        updateStatus(`Ready | Input: ${actualInputTokens} tokens | Output: ${responseTokens} tokens`);
      }
    } catch (error) {
      console.error("Error generating questions:", error);
      
      if (error.name === 'AbortError') {
        updateStatus('Error: Request timed out');
        loadingMessage.textContent = "Request timed out after 90 seconds. The Ollama server might be busy or the model might be too large for the current request.";
      } else {
        updateStatus(`Error: ${error.message}`);
        loadingMessage.textContent = `Failed to generate questions: ${error.message}`;
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
        const success = await updatePageContentCache();
        if (!success) {
          throw new Error("Failed to load page content");
        }
      }
      
      // Safety check for null content
      if (!currentPageContent) {
        throw new Error("Page content is empty or unavailable");
      }
      
      // Get settings
      const settings = await chrome.storage.local.get([
        'endpoint', 
        'model',
        'maxTokens',
        'systemPrompt'
      ]);
      
      const endpoint = settings.endpoint || 'http://localhost:11434';
      const model = settings.model || 'llama3';
      const maxTokens = settings.maxTokens || 8000;
      const systemPrompt = settings.systemPrompt || 'You are a helpful assistant that summarizes web content concisely and accurately.';
      
      // Prepare the prompt with safety checks
      const safeTitle = currentPageTitle || "Untitled Page";
      const safeUrl = currentPageUrl || "No URL available";
      const safeContent = currentPageContent || "No content available";
      
      // Calculate optimal content length based on token count
      // For very large pages, we'll use a sliding window approach
      let contentToSend = safeContent;
      let actualInputTokens = currentTokenCount;
      
      if (currentTokenCount > maxTokens) {
        // If content is too large, take the first part and a sample from the middle and end
        const firstPart = Math.floor(maxTokens * 0.6); // 60% from the beginning
        const middlePart = Math.floor(maxTokens * 0.2); // 20% from the middle
        const lastPart = Math.floor(maxTokens * 0.2); // 20% from the end
        
        const firstSection = safeContent.substring(0, firstPart * 4); // Convert tokens to chars
        
        const middleStart = Math.floor(safeContent.length / 2) - (middlePart * 2);
        const middleSection = safeContent.substring(middleStart, middleStart + (middlePart * 4));
        
        const lastStart = safeContent.length - (lastPart * 4);
        const lastSection = safeContent.substring(lastStart);
        
        contentToSend = `${firstSection}\n\n[...content truncated...]\n\n${middleSection}\n\n[...content truncated...]\n\n${lastSection}`;
        actualInputTokens = maxTokens;
        
        updateStatus(`Processing | Input: ${maxTokens} tokens (truncated from ${currentTokenCount})`);
      } else {
        updateStatus(`Processing | Input: ${currentTokenCount} tokens`);
      }
      
      const prompt = `${systemPrompt}
      
You are answering questions about the following webpage:

Title: ${safeTitle}
URL: ${safeUrl}

Content:
${contentToSend}

User question: ${userMessage}

Please provide a helpful and accurate response based on the webpage content.`;
      
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
        // Replace the loading message with the actual response
        loadingMessage.textContent = data.response;
        
        // Calculate response tokens
        const responseTokens = estimateTokenCount(data.response);
        updateStatus(`Ready | Input: ${actualInputTokens} tokens | Output: ${responseTokens} tokens`);
      }
    } catch (error) {
      console.error("Error in chat:", error);
      
      if (error.name === 'AbortError') {
        updateStatus('Error: Request timed out');
        loadingMessage.textContent = "Request timed out after 90 seconds. The Ollama server might be busy or the model might be too large for the current request.";
      } else {
        updateStatus('Error: ' + error.message);
        loadingMessage.textContent = `Error: ${error.message}`;
      }
    }
  }
  
  // Function to update status
  function updateStatus(message) {
    statusElement.textContent = message;
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
    
    return messageText; // Return the text element so it can be updated later
  }
  
  // Initialize by checking if we need to update the page content cache
  // Wait a moment before trying to get page content to ensure everything is ready
  setTimeout(() => {
    updatePageContentCache().then(() => {
      // Add welcome message
      addMessageToChat('assistant', 'Welcome to Sidekick! Click "Summarize This Page" to get started, or ask me a question about the current page.');
    });
  }, 1000);
});
