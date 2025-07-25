import warnings
from fastapi import FastAPI, HTTPException, status
from pydantic import BaseModel
import uvicorn
import os
from typing import List

# LangChain components
from langchain_community.chat_models import ChatOllama
from langchain_community.embeddings import OllamaEmbeddings
from langchain_postgres import PGVector
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.chains.combine_documents import create_stuff_documents_chain
from langchain.chains import create_retrieval_chain
from langchain_core.prompts import ChatPromptTemplate
from fastapi.middleware.cors import CORSMiddleware

# SQLAlchemy for direct DB query
from sqlalchemy import create_engine, text, inspect

# Suppress all warnings
warnings.filterwarnings('ignore')

# ---  GLOBAL OBJECTS (INITIALIZED ONCE AT STARTUP) ---

# Global variables to hold shared components
llm = None
embeddings = None
connection_string = None
prompt = None
document_chain = None
engine = None  # SQLAlchemy engine
inspector = None # SQLAlchemy inspector
rag_chain_cache = {}
is_server_ready = False # Boolean flag to indicate server readiness

# --- FASTAPI APP SETUP ---

app = FastAPI(
    title="Dynamic RAG Server",
    description="An API to ingest, query, and manage data sources in PGVector.",
    version="2.7.0", # Version updated for robust delete
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- STARTUP EVENT ---

@app.on_event("startup")
def startup_event():
    """
    Event handler that runs when the FastAPI application starts.
    It initializes the shared components and sets the server readiness flag.
    """
    global llm, embeddings, connection_string, prompt, document_chain, is_server_ready
    global engine, inspector

    print("--- Server starting up: Initializing shared components... ---")

    # Initialize Ollama models
    ollama_host = os.getenv("OLLAMA_HOST", "localhost")
    ollama_port = os.getenv("OLLAMA_PORT", "11434")
    ollama_url = f"http://{ollama_host}:{ollama_port}"
    
    llm = ChatOllama(model="llama3.2:1b", base_url=ollama_url)
    embeddings = OllamaEmbeddings(model="nomic-embed-text", base_url=ollama_url)

    # Get the database connection string from environment variables
    try:
        connection_string = os.environ["PG_VECTOR_DATABASE_URL"]
        print("--- Found PG_VECTOR_DATABASE_URL environment variable. ---")
    except KeyError:
        print("--- FATAL ERROR: PG_VECTOR_DATABASE_URL environment variable not set. ---")
        raise

    # Initialize SQLAlchemy engine and inspector once
    engine = create_engine(connection_string)
    inspector = inspect(engine)

    # Define a single, reusable prompt template
    prompt = ChatPromptTemplate.from_template("""
    Answer the following question based only on the provided context:

    <context>
    {context}
    </context>

    Question: {input}
    """)
    
    # Create the 'stuff' documents chain once, as it doesn't change
    document_chain = create_stuff_documents_chain(llm, prompt)

    print("--- Shared components initialized successfully. Server is ready. ---")
    # Set the readiness flag to True after successful initialization
    is_server_ready = True


# --- HELPER FUNCTION FOR RAG CHAIN ---

def get_rag_chain(collection_name: str):
    """
    Retrieves a RAG chain for a given collection from the cache, or creates and
    caches a new one if it doesn't exist.
    """
    global rag_chain_cache
    
    if collection_name in rag_chain_cache:
        print(f"--- Found cached chain for collection: {collection_name} ---")
        return rag_chain_cache[collection_name]
    
    print(f"--- No cached chain found. Creating new chain for collection: {collection_name} ---")
    try:
        vector_store = PGVector(
            embeddings=embeddings,
            collection_name=collection_name,
            connection=connection_string,
        )
        retriever = vector_store.as_retriever()
        retrieval_chain = create_retrieval_chain(retriever, document_chain)
        rag_chain_cache[collection_name] = retrieval_chain
        print(f"--- Successfully cached new chain for: {collection_name} ---")
        return retrieval_chain
    except Exception as e:
        print(f"Error creating RAG chain: {e}")
        raise HTTPException(
            status_code=404,
            detail=f"Collection '{collection_name}' not found or could not be accessed."
        )

# --- API ENDPOINTS ---

class IngestRequest(BaseModel):
    collection_name: str
    content: str

class IngestResponse(BaseModel):
    message: str
    collection_name: str
    documents_added: int

@app.post("/ingest", response_model=IngestResponse)
async def ingest_data(request: IngestRequest):
    """API endpoint to ingest a new data source."""
    if not is_server_ready:
        raise HTTPException(status_code=503, detail="Server is not fully initialized.")

    print(f"--- Received request to ingest data into collection: {request.collection_name} ---")
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
    documents = text_splitter.create_documents([request.content])
    
    if not documents:
        raise HTTPException(status_code=400, detail="Content could not be split into documents.")

    PGVector.from_documents(
        embedding=embeddings,
        documents=documents,
        collection_name=request.collection_name,
        connection=connection_string,
        pre_delete_collection=True,
    )

    if request.collection_name in rag_chain_cache:
        del rag_chain_cache[request.collection_name]
        print(f"--- Cleared cache for updated collection: {request.collection_name} ---")

    print(f"--- Successfully ingested {len(documents)} documents into {request.collection_name} ---")
    
    return IngestResponse(
        message="Data ingested successfully.",
        collection_name=request.collection_name,
        documents_added=len(documents)
    )

class QuestionRequest(BaseModel):
    question: str
    collection_name: str

class AnswerResponse(BaseModel):
    answer: str

@app.post("/ask", response_model=AnswerResponse)
async def ask_question(request: QuestionRequest):
    """API endpoint to ask a question to a specific data source (collection)."""
    if not is_server_ready:
        raise HTTPException(status_code=503, detail="Server is not fully initialized.")

    print(f"--- Received question for collection '{request.collection_name}': {request.question} ---")
    retrieval_chain = get_rag_chain(collection_name=request.collection_name)
    response = retrieval_chain.invoke({"input": request.question})
    print(f"--- Generated answer: {response['answer']} ---")
    return AnswerResponse(answer=response['answer'])

@app.get("/collections", response_model=List[str])
async def list_collections():
    """
    API endpoint to list all available collections (data sources) in the vector store.
    """
    if not is_server_ready:
        raise HTTPException(status_code=503, detail="Server is not fully initialized.")
    
    try:
        collection_table_name = "langchain_pg_collection"
        if not inspector.has_table(collection_table_name):
            print(f"--- Collection table '{collection_table_name}' does not exist. Returning empty list. ---")
            return []

        with engine.connect() as connection:
            query = text(f"SELECT name FROM {collection_table_name}")
            result = connection.execute(query)
            collections = [row[0] for row in result]
        
        print(f"--- Found collections: {collections} ---")
        return collections
    except Exception as e:
        print(f"Error listing collections: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve collections from the database.")

# --- UPDATED ENDPOINT TO DELETE A COLLECTION ---
@app.delete("/collections/{collection_name}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_collection(collection_name: str):
    """
    API endpoint to robustly delete a specific collection and all its associated embeddings
    by using direct SQL commands.
    """
    if not is_server_ready:
        raise HTTPException(status_code=503, detail="Server is not fully initialized.")

    print(f"--- Received request to delete collection: {collection_name} ---")
    
    collection_table = "langchain_pg_collection"
    embedding_table = "langchain_pg_embedding"

    try:
        with engine.begin() as connection:  # Begins a transaction
            # 1. Find the UUID of the collection to be deleted
            find_query = text(f"SELECT uuid FROM {collection_table} WHERE name = :coll_name")
            result = connection.execute(find_query, {"coll_name": collection_name}).first()
            
            if not result:
                raise HTTPException(status_code=404, detail=f"Collection '{collection_name}' not found.")
                
            collection_uuid = result[0]
            
            # 2. Delete all embeddings associated with that collection UUID
            delete_embeddings_query = text(f"DELETE FROM {embedding_table} WHERE collection_id = :coll_id")
            connection.execute(delete_embeddings_query, {"coll_id": collection_uuid})
            
            # 3. Delete the collection's entry from the management table
            delete_collection_query = text(f"DELETE FROM {collection_table} WHERE uuid = :coll_id")
            connection.execute(delete_collection_query, {"coll_id": collection_uuid})

        # 4. Also remove the chain from the in-memory cache if it exists
        if collection_name in rag_chain_cache:
            del rag_chain_cache[collection_name]
            print(f"--- Cleared cache for deleted collection: {collection_name} ---")

        print(f"--- Successfully deleted collection '{collection_name}' from database. ---")
        return

    except HTTPException as http_exc:
        # Re-raise HTTPException to ensure FastAPI handles it correctly
        raise http_exc
    except Exception as e:
        print(f"An unexpected database error occurred while deleting '{collection_name}': {e}")
        raise HTTPException(status_code=500, detail="Failed to delete collection due to a database error.")
