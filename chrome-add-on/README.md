# Sidekick: AI Web Assistant for Chrome

Sidekick is a Chrome extension that provides a sidebar-like interface for summarizing web pages and interacting with locally running LLMs via Ollama.

## Solution Overview

This project consists of two main components:

1. **Chrome Extension**: A sidebar-like interface that allows you to:
   - Summarize the current webpage
   - Generate questions about the page content
   - Chat with an AI about the page content
   - Customize system prompts and model settings
   - Reset conversations and context

2. **Proxy Server**: A Python-based proxy that:
   - Handles CORS issues between the browser and local LLM servers
   - Forwards requests from the extension to Ollama
   - Returns AI responses to the extension

The extension works with locally running LLM models on Ollama, giving you privacy and control over your AI interactions while browsing the web.

## Features

- **Page Summarization**: Get concise summaries of any webpage
- **Suggested Questions**: Generate relevant questions about the page content
- **Chat Interface**: Ask follow-up questions about the page
- **Customizable Settings**: Configure your LLM endpoint, model, and system prompts
- **Auto-summarize**: Option to automatically summarize pages when they load
- **Clean Interface**: Sidebar-like design that doesn't interfere with browsing
- **Context Management**: Automatically resets context when switching between tabs or navigating to new pages
- **Conversation Reset**: Easily reset the current conversation and reload page content with a single click

## Prerequisites

- Chrome browser (or any Chromium-based browser like Edge, Brave, etc.)
- Python 3.6+ (for the proxy server)
- Ollama running locally

## Setting Up the Chrome Extension

### Installing the Extension in Chrome

1. Open Chrome
2. Enter `chrome://extensions` in the address bar
3. Enable "Developer mode" in the top-right corner
4. Click "Load unpacked"
5. Select the `chrome-add-on` folder from your cloned repository

## Running the Proxy Server

The proxy server is required to bypass CORS restrictions and allow the extension to communicate with your local LLM server.

### Option 1: Running Directly on Host

1. Install the required Python package:
   ```
   pip install requests
   ```

2. Run the proxy server:
   ```
   cd ollama_proxy
   python ollama_proxy.py
   ```

3. The proxy will start on port 8765 by default

### Option 2: Running with Docker

1. Build the Docker image:
   ```
   cd ollama_proxy
   docker build -t ffxaisidebar .
   ```

2. Run the container:
   ```
   docker run -d --name ffxaisidebar -p 8765:8765 ffxaisidebar
   ```

#### Using Docker Compose

Alternatively, you can use Docker Compose:
```
cd ollama_proxy
docker-compose up -d
```

## Usage

1. Make sure your LLM server (Ollama) is running
2. Make sure the proxy server is running
3. Click the extension icon in the Chrome toolbar to open the sidebar window
4. Configure your settings (Ollama endpoint, model name, etc.)
   - When using a proxy server directly on your host: Set endpoint to `http://localhost:11434` and your desired model name
   - When using a proxy server as a Docker container: Set endpoint to `http://host.docker.internal:11434` and your desired model name
5. Browse to any webpage you want to analyze
6. Click "Summarize This Page" to generate a summary
7. Use the suggested questions or ask your own in the chat interface
8. Use the "Reset Conversation" button to clear the current conversation and reload the page content

## Context Management

The extension automatically handles context switching between tabs:

- When you switch to a different tab, the sidebar automatically resets and loads the content of the new tab
- When you navigate to a new page within the same tab, the sidebar detects the change and resets accordingly
- You can manually reset the conversation at any time using the reset button

This ensures that the AI always has the correct context for the page you're currently viewing.

## Troubleshooting

- If the sidebar doesn't load content, check that the proxy server is running
- If switching between tabs doesn't update the sidebar, try manually clicking the reset button
- Check the browser console for any error messages (press F12 to open developer tools)

## Key Differences from Firefox Version

- Uses a popup window instead of Firefox's native sidebar
- Uses Chrome's storage API instead of Firefox's
- Uses Chrome's messaging system for communication between components
- Uses Manifest V3 instead of V2
- Uses service worker instead of background page

## License

This project is licensed under the MIT License - see the LICENSE file for details.
