# Description

This is a simple project which aims to demonstrate how to build and use a RAG application.

# Steps to run

## Step 1: Build docker images locally
```
// For server
cd server
docker build . -t rag-server

// For ui
cd ui
docker build . -t rag-ui

// For ollama
cd ollama
docker build . -t rag-ollama
```

## Step 2: Run docker-compose
```
docker-compose up
```