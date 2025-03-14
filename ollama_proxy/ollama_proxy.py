#!/usr/bin/env python3
from http.server import HTTPServer, BaseHTTPRequestHandler
import json
import requests
import traceback
import time
import sys

class OllamaProxy(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        print(format % args)
        sys.stdout.flush()  # Ensure logs are displayed immediately
        
    def do_OPTIONS(self):
        print("Received OPTIONS request")
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
        
    def do_POST(self):
        try:
            print("Received POST request")
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            
            print(f"Request data: endpoint={data['endpoint']}, model={data['model']}")
            print(f"Prompt length: {len(data['prompt'])} characters")
            
            start_time = time.time()
            print(f"Forwarding request to Ollama at {data['endpoint']}")
            
            # Forward request to Ollama
            ollama_response = requests.post(
                f"{data['endpoint']}/api/generate",
                json={
                    "model": data['model'],
                    "prompt": data['prompt'],
                    "stream": False
                },
                timeout=120  # 2 minute timeout
            )
            
            elapsed_time = time.time() - start_time
            print(f"Ollama response received in {elapsed_time:.2f} seconds")
            print(f"Response status: {ollama_response.status_code}")
            
            # Send response back to extension
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            if ollama_response.status_code == 200:
                print("Successfully received response from Ollama")
                response_json = ollama_response.json()
                
                # Check if the response has the expected format
                if "response" in response_json:
                    print(f"Response length: {len(response_json['response'])} characters")
                    self.wfile.write(ollama_response.content)
                else:
                    print(f"Unexpected response format: {response_json}")
                    error_response = {
                        "error": "Unexpected response format from Ollama",
                        "details": str(response_json)
                    }
                    self.wfile.write(json.dumps(error_response).encode('utf-8'))
            else:
                print(f"Error from Ollama: {ollama_response.text}")
                error_response = {
                    "error": f"Ollama API error: {ollama_response.status_code}",
                    "details": ollama_response.text
                }
                self.wfile.write(json.dumps(error_response).encode('utf-8'))
                
        except requests.exceptions.Timeout:
            print("Request to Ollama timed out")
            self.send_response(504)  # Gateway Timeout
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            error_response = {
                "error": "Request to Ollama timed out after 120 seconds"
            }
            self.wfile.write(json.dumps(error_response).encode('utf-8'))
            
        except requests.exceptions.ConnectionError:
            print("Connection error when connecting to Ollama")
            self.send_response(502)  # Bad Gateway
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            error_response = {
                "error": "Could not connect to Ollama server. Make sure it's running."
            }
            self.wfile.write(json.dumps(error_response).encode('utf-8'))
            
        except Exception as e:
            print(f"Exception in do_POST: {str(e)}")
            traceback.print_exc()
            
            self.send_response(500)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            error_response = {
                "error": f"Proxy server error: {str(e)}"
            }
            self.wfile.write(json.dumps(error_response).encode('utf-8'))

def run_server(port=8765):
    server_address = ('', port)
    httpd = HTTPServer(server_address, OllamaProxy)
    print(f"Starting Ollama proxy server on port {port}...")
    print(f"Press Ctrl+C to stop the server")
    sys.stdout.flush()  # Ensure logs are displayed immediately
    
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("Stopping server...")
        httpd.server_close()
        print("Server stopped")

if __name__ == '__main__':
    run_server()