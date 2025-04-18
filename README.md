# Sidekick: AI Web Assistant for Chrome and Firefox

Sidekick is a browser extension that provides an AI-powered assistant for summarizing web pages and interacting with locally running LLMs via Ollama. It's available for both Chrome and Firefox browsers.

![Sidekick Extension Demo](media/slides.gif)

## Solution Overview

This project consists of two main components:

1. **Browser Extension**: Available for both Chrome and Firefox, providing:
   - Webpage summarization
   - AI-generated questions about page content
   - Chat interface for discussing page content
   - Customizable system prompts and model settings
   - Context management across tabs and navigation

2. **Proxy Server**: A lightweight Python server that:
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
- **Context Management**: Automatically resets context when switching between tabs or navigating to new pages
- **Conversation Reset**: Easily reset the current conversation and reload page content with a single click
- **Cross-Browser Support**: Works on both Firefox and Chrome-based browsers

## Prerequisites

- Firefox or Chrome browser
- Python 3.6+ (for the proxy server)
- Ollama running locally

## Browser-Specific Implementations

### Firefox Version
- Uses Firefox's native sidebar API
- Integrates directly into the browser window
- Toggled with Ctrl+Shift+O or via toolbar button

### Chrome Version
- Creates a popup window that simulates a sidebar
- Positions itself at the right edge of the browser window
- Toggled via toolbar button (also supports Ctrl+Shift+O)

## Setting Up the Extension

### Firefox Installation

1. Open Firefox
2. Enter `about:debugging` in the address bar
3. Click "This Firefox"
4. Click "Load Temporary Add-on"
5. Select the `manifest.json` file from the `add-on` folder

### Chrome Installation

1. Open Chrome
2. Enter `chrome://extensions` in the address bar
3. Enable "Developer mode" in the top-right corner
4. Click "Load unpacked"
5. Select the `chrome-add-on` folder

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
3. Click the extension icon in the browser toolbar to open the sidebar
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

## Technical Implementation Details

### Communication Flow

1. **User Interaction**: User clicks a button in the sidebar (e.g., "Summarize This Page")
2. **Content Extraction**: Extension extracts text content from the current webpage
3. **Proxy Communication**: Extension sends the content to the proxy server along with the desired LLM model
4. **LLM Processing**: Proxy forwards the request to Ollama, which processes it with the specified model
5. **Response Display**: Results are returned to the extension and displayed in the sidebar

### Error Handling

The extension includes robust error handling for various scenarios:

- Browser restricted pages (chrome://, about:, etc.)
- Connection issues with the proxy server
- Timeouts from the LLM
- Missing or invalid page content

### Security Considerations

- All processing happens locally using Ollama
- No data is sent to external servers
- Users have full control over which model is used
- The extension requires minimal permissions

## Troubleshooting

- If the sidebar doesn't load content, check that the proxy server is running
- If switching between tabs doesn't update the sidebar, try manually clicking the reset button
- Check the browser console for any error messages (press F12 to open developer tools)
- For Chrome, make sure you're on a regular web page (not a chrome:// or extension page)
- For Firefox, ensure the sidebar has permission to access the current page

## Future Enhancements

- Support for more LLM providers beyond Ollama
- Enhanced content extraction for complex web pages
- PDF document support
- History of past summaries and conversations
- Custom themes and UI options

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
