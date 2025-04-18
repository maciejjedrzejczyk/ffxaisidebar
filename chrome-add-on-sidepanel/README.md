# Sidekick: AI Web Assistant for Chrome

Sidekick is a Chrome extension that provides an AI-powered assistant for summarizing web pages and interacting with locally running LLMs via Ollama.

## Features

- **Page Summarization**: Get concise summaries of any webpage
- **Suggested Questions**: Generate relevant questions about the page content
- **Chat Interface**: Ask follow-up questions about the page
- **Customizable Settings**: Configure your LLM endpoint, model, and system prompts
- **Auto-summarize**: Option to automatically summarize pages when they load
- **Context Management**: Automatically resets context when switching between tabs or navigating to new pages

## Prerequisites

- Chrome browser
- Python 3.6+ (for the proxy server)
- Ollama running locally

## Installation

1. Open Chrome
2. Enter `chrome://extensions` in the address bar
3. Enable "Developer mode" in the top-right corner
4. Click "Load unpacked"
5. Select the `chrome-add-on-sidepanel` folder

## Running the Proxy Server

The proxy server is required to bypass CORS restrictions and allow the extension to communicate with your local LLM server.

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

## Usage

1. Make sure your LLM server (Ollama) is running
2. Make sure the proxy server is running
3. Click the extension icon in the Chrome toolbar to open the sidebar popup
4. Configure your settings (Ollama endpoint, model name, etc.)
5. Browse to any webpage you want to analyze
6. Click "Summarize This Page" to generate a summary
7. Use the suggested questions or ask your own in the chat interface
8. Use the "Reset Conversation" button to clear the current conversation and reload the page content

## Implementation Note

This version uses a popup window approach that simulates a sidebar by positioning itself at the right edge of the browser window. While Chrome does have a Side Panel API, it's still relatively new and may not be fully compatible with all use cases.

## Troubleshooting

- If the sidebar doesn't load content, check that the proxy server is running
- If switching between tabs doesn't update the sidebar, try manually clicking the reset button
- Check the browser console for any error messages (press F12 to open developer tools)
- Make sure you're on a regular web page (not a chrome:// or extension page)

## License

This project is licensed under the MIT License - see the LICENSE file for details.
