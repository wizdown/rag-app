import warnings
from fastapi import FastAPI
from pydantic import BaseModel
import uvicorn
import os

# LangChain components
from langchain_community.chat_models import ChatOllama
from langchain_community.embeddings import OllamaEmbeddings
from langchain_community.vectorstores import FAISS
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.chains.combine_documents import create_stuff_documents_chain
from langchain.chains import create_retrieval_chain
from langchain_core.prompts import ChatPromptTemplate
from fastapi.middleware.cors import CORSMiddleware

# Suppress all warnings
warnings.filterwarnings('ignore')

# --- DATA AND MODEL SETUP (GLOBAL) ---
# This part of the code will run only once when the server starts.

# 1. Define the Data Source
data_source = """
The Apollo program, also known as Project Apollo, was the third United States human spaceflight program 
carried out by the National Aeronautics and Space Administration (NASA), which succeeded in preparing and 
landing the first humans on the Moon from 1968 to 1972. It was first conceived during Dwight D. Eisenhower's 
administration as a three-person spacecraft to follow the one-person Project Mercury, which put the first 
Americans in space. The Apollo program was later dedicated to President John F. Kennedy's national goal for 
the 1960s of "landing a man on the Moon and returning him safely to the Earth" in an address to Congress on 
May 25, 1961. It was the third U.S. human spaceflight program to fly, preceded by the two-person Project 
Gemini conceived in 1961 to extend spaceflight capability in support of Apollo. Kennedy's goal was 
accomplished on the Apollo 11 mission on July 20, 1969, with the landing of astronauts Neil Armstrong 
and Buzz Aldrin on the Moon, while Michael Collins remained in lunar orbit. Five subsequent Apollo missions 
also landed astronauts on the Moon, the last in December 1972. In these six spaceflights, twelve men 
walked on the Moon.
"""

# 2. Create the RAG Chain
def create_rag_chain():
    """
    This function encapsulates the creation of the RAG chain.
    It's called once at startup.
    """
    # Split documents
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
    documents = text_splitter.create_documents([data_source])
    
    # Create embeddings and vector store
    ollama_host = os.getenv("OLLAMA_HOST", "localhost")
    ollama_port = os.getenv("OLLAMA_PORT", "11434")
    ollama_url = f"http://{ollama_host}:{ollama_port}"
    embeddings = OllamaEmbeddings(model="nomic-embed-text", base_url=ollama_url)
    vector_store = FAISS.from_documents(documents, embeddings)
    
    # Define the LLM
    llm = ChatOllama(model="phi3:mini-128k", base_url=ollama_url)
    
    # Create a prompt template
    prompt = ChatPromptTemplate.from_template("""
    Answer the following question based only on the provided context:

    <context>
    {context}
    </context>

    Question: {input}
    """)
    
    # Create the 'stuff' documents chain
    document_chain = create_stuff_documents_chain(llm, prompt)
    
    # Create the retriever
    retriever = vector_store.as_retriever()
    
    # Create the final retrieval chain
    retrieval_chain = create_retrieval_chain(retriever, document_chain)
    
    return retrieval_chain

# --- FASTAPI SERVER SETUP ---

# Initialize the FastAPI app
app = FastAPI(
    title="RAG Server with Ollama",
    description="A simple API to ask questions to a RAG model using local Ollama models.",
    version="1.0.0",
)

# --- ADD THIS MIDDLEWARE CONFIGURATION ---
# This allows the frontend (running on localhost:3000) to communicate with the backend.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins for simplicity. For production, you'd list specific domains.
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods (GET, POST, etc.)
    allow_headers=["*"],  # Allows all headers
)

# A global variable to hold the RAG chain
rag_chain = None

@app.on_event("startup")
def startup_event():
    """
    Event handler that runs when the FastAPI application starts.
    It creates and initializes the RAG chain.
    """
    global rag_chain
    print("--- Server starting up: Initializing RAG chain... ---")
    rag_chain = create_rag_chain()
    print("--- RAG chain initialized successfully. Server is ready. ---")

# Define the request body model for the /ask endpoint
class QuestionRequest(BaseModel):
    question: str

# Define the response body model
class AnswerResponse(BaseModel):
    answer: str

@app.post("/ask", response_model=AnswerResponse)
async def ask_question(request: QuestionRequest):
    """
    API endpoint to ask a question.
    It receives a question in the request body and returns the model's answer.
    """
    if rag_chain is None:
        return {"error": "RAG chain is not initialized."}
    
    print(f"--- Received question: {request.question} ---")
    
    # Invoke the RAG chain with the user's question
    response = rag_chain.invoke({"input": request.question})
    
    print(f"--- Generated answer: {response['answer']} ---")
    
    # Return the answer from the RAG chain's response
    return AnswerResponse(answer=response['answer'])

# Main entry point to run the server
if __name__ == "__main__":
    # Use uvicorn to run the app.
    # host="0.0.0.0" makes it accessible from your local network.
    # reload=True automatically restarts the server when you change the code.
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)