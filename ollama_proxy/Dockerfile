# Use a lightweight Python image
FROM python:3.9-slim

# Set working directory
WORKDIR /app

# Copy the proxy script
COPY ollama_proxy.py /app/

# Install required packages
RUN pip install --no-cache-dir requests

# Expose the port the proxy runs on
EXPOSE 8765

# Set the script as executable
RUN chmod +x /app/ollama_proxy.py

# Run the proxy when the container starts
CMD ["python", "/app/ollama_proxy.py"]