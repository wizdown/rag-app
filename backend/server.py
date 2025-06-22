import warnings
from fastapi import FastAPI
from pydantic import BaseModel
import uvicorn
import os

# LangChain components
from langchain_community.chat_models import ChatOllama
from langchain_community.embeddings import OllamaEmbeddings
from langchain_postgres import PGVector
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

    # Setup Ollama embeddings model
    ollama_host = os.getenv("OLLAMA_HOST", "localhost")
    ollama_port = os.getenv("OLLAMA_PORT", "11434")
    ollama_url = f"http://{ollama_host}:{ollama_port}"
    embeddings = OllamaEmbeddings(model="nomic-embed-text", base_url=ollama_url)

    # Bootup fails if DATABASE_URL is not set
    try:
        connection_string = os.environ["PG_VECTOR_DATABASE_URL"]
        print("--- Found PG_VECTOR_DATABASE_URL environment variable. ---")
    except KeyError:
        print("--- FATAL ERROR: PG_VECTOR_DATABASE_URL environment variable not set. ---")
        # Re-raise the exception to ensure the application stops.
        raise

    collection_name = "apollo_program_docs"

    vector_store = PGVector.from_documents(
        embedding=embeddings,
        documents=documents,
        collection_name=collection_name,
        connection=connection_string,
        pre_delete_collection=True,
    )

    llm = ChatOllama(model="phi3:mini-128k", base_url=ollama_url)
    
    prompt = ChatPromptTemplate.from_template("""
    Answer the following question based only on the provided context:

    <context>
    {context}
    </context>

    Question: {input}
    """)
    
    document_chain = create_stuff_documents_chain(llm, prompt)
    retriever = vector_store.as_retriever()
    retrieval_chain = create_retrieval_chain(retriever, document_chain)
    
    return retrieval_chain

# --- FASTAPI SERVER SETUP ---

app = FastAPI(
    title="RAG Server",
    description="A simple API to ask questions to a RAG model using local Ollama models and PGVector.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

rag_chain = None

@app.on_event("startup")
def startup_event():
    global rag_chain
    print("--- Server starting up: Initializing RAG chain with PGVector... ---")
    rag_chain = create_rag_chain()
    print("--- RAG chain initialized successfully. Server is ready. ---")

class QuestionRequest(BaseModel):
    question: str

class AnswerResponse(BaseModel):
    answer: str

@app.post("/ask", response_model=AnswerResponse)
async def ask_question(request: QuestionRequest):
    if rag_chain is None:
        return {"error": "RAG chain is not initialized."}
    
    print(f"--- Received question: {request.question} ---")
    response = rag_chain.invoke({"input": request.question})
    print(f"--- Generated answer: {response['answer']} ---")
    return AnswerResponse(answer=response['answer'])

if __name__ == "__main__":
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)