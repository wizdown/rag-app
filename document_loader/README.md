# Confluence RAG Application

A simple RAG (Retrieval-Augmented Generation) application that loads data from Confluence and provides question-answering capabilities using LangChain, PostgreSQL with pgvector, and Ollama.

## Features

- Load documents from Confluence spaces using LangChain's ConfluenceLoader
- Store document embeddings in PostgreSQL with pgvector
- Query documents using Ollama models (llama3.2:1b for LLM, nomic-embed-text for embeddings)
- Interactive question-answering interface
- Support for multiple Confluence spaces

## Prerequisites

1. **PostgreSQL with pgvector extension**
2. **Ollama server** running with the following models:
   - `llama3.2:1b` (for LLM)
   - `nomic-embed-text` (for embeddings)
3. **Confluence API access** (URL, username, and API token)

## Installation

1. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Set up environment variables:**
   ```bash
   export CONFLUENCE_URL="https://your-company.atlassian.net"
   export CONFLUENCE_USERNAME="your.email@company.com"
   export CONFLUENCE_API_TOKEN="your_api_token"
   export CONFLUENCE_SPACE_KEYS="SPACE1,SPACE2"
   export PG_VECTOR_DATABASE_URL="postgresql://user:password@localhost:5432/vectordb"
   ```

3. **Ensure Ollama is running:**
   ```bash
   # Start Ollama server
   ollama serve
   
   # Pull required models
   ollama pull llama3.2:1b
   ollama pull nomic-embed-text
   ```

## Usage

### Basic Usage

```python
from confluence_loader import ConfluenceRAGApp

# Initialize the application
rag_app = ConfluenceRAGApp(
    confluence_url="https://your-company.atlassian.net",
    username="your.email@company.com",
    api_token="your_api_token",
    space_keys=["SPACE1", "SPACE2"],
    db_connection_string="postgresql://user:password@localhost:5432/vectordb"
)

# Load data from Confluence
rag_app.load_confluence_data()

# Ask questions
answer = rag_app.askQuery("What is the project overview?")
print(answer)
```

### Running the Main Application

```bash
python confluence_loader.py
```

The main application will:
1. Initialize the RAG components
2. Run example queries (if data is loaded)
3. Start an interactive mode for asking questions

## Configuration

### Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `CONFLUENCE_URL` | Base URL of your Confluence instance | `https://your-company.atlassian.net` |
| `CONFLUENCE_USERNAME` | Your Confluence username/email | `your.email@company.com` |
| `CONFLUENCE_API_TOKEN` | Your Confluence API token | `your_api_token` |
| `CONFLUENCE_SPACE_KEYS` | Comma-separated list of space keys | `SPACE1,SPACE2` |
| `PG_VECTOR_DATABASE_URL` | PostgreSQL connection string | `postgresql://user:password@localhost:5432/vectordb` |

### Confluence API Token

To get your Confluence API token:
1. Go to https://id.atlassian.com/manage-profile/security/api-tokens
2. Click "Create API token"
3. Give it a name and copy the token

## Database Setup

Make sure your PostgreSQL database has the pgvector extension installed:

```sql
-- Install pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create a database for vector storage
CREATE DATABASE vectordb;
```

## API Methods

### `load_confluence_data(collection_name: str = "confluence_docs")`
Loads documents from specified Confluence spaces and stores them in the vector database.

### `askQuery(query: str, collection_name: str = "confluence_docs") -> str`
Asks a question and returns an answer based on the loaded Confluence data.

### `list_collections() -> List[str]`
Lists all available collections in the database.

## Troubleshooting

### Common Issues

1. **Import errors**: Make sure all dependencies are installed with `pip install -r requirements.txt`

2. **Ollama connection errors**: Ensure Ollama server is running and accessible at the specified host/port

3. **Confluence API errors**: Verify your API token and space keys are correct

4. **Database connection errors**: Check your PostgreSQL connection string and ensure pgvector extension is installed

### Debug Mode

To enable more verbose logging, you can modify the print statements in the code or add logging configuration.

## Example Output

```
Initializing Confluence RAG Application...
Initializing LangChain components...
Components initialized successfully!

==================================================
EXAMPLE QUERIES
==================================================

Question: What is the project overview?
Processing query: What is the project overview?
Generated answer: Based on the Confluence documentation, this project is a...

Question: How do I set up the development environment?
Processing query: How do I set up the development environment?
Generated answer: To set up the development environment, you need to...

==================================================
INTERACTIVE MODE
==================================================
Type 'quit' to exit

Enter your question: What are the API endpoints?
Processing query: What are the API endpoints?
Generated answer: The API endpoints include...
``` 