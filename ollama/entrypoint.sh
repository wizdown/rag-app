#!/bin/sh
set -e

# Start Ollama server in the background
ollama serve &
OLLAMA_PID=$!

# Wait for the server to be ready
sleep 5

# Pull required models
ollama pull phi3:mini-128k
ollama pull nomic-embed-text

# Wait for the Ollama server to exit (keep container running)
wait $OLLAMA_PID 