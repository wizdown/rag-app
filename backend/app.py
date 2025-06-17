import warnings
from langchain_community.chat_models import ChatOllama
from langchain_community.embeddings import OllamaEmbeddings
from langchain_community.vectorstores import FAISS
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.chains.combine_documents import create_stuff_documents_chain
from langchain.chains import create_retrieval_chain
from langchain_core.prompts import ChatPromptTemplate

# Suppress all warnings
warnings.filterwarnings('ignore')

# --- 1. DEFINE THE DATA SOURCE (KNOWLEDGE BASE) ---
# This is the static text paragraph that the RAG model will use as its knowledge base.
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

print("--- Data Source Loaded ---")

# --- 2. INDEXING: SPLIT THE DOCUMENT INTO CHUNKS ---
# We split the document into smaller chunks to make it easier for the model to find relevant information.
text_splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
documents = text_splitter.create_documents([data_source])
print(f"--- Document split into {len(documents)} chunks ---")

# --- 3. INDEXING: CREATE EMBEDDINGS AND STORE IN A VECTOR DATABASE ---
# We use a local Ollama model to create embeddings (numerical representations) of each text chunk.
# These embeddings are then stored in an in-memory FAISS vector database.
print("--- Creating embeddings and vector store... ---")
# Use the 'nomic-embed-text' model for embeddings
embeddings = OllamaEmbeddings(model="nomic-embed-text")
# Create the FAISS vector store from the document chunks and embeddings
vector_store = FAISS.from_documents(documents, embeddings)
print("--- Vector Store Created ---")

# --- 4. RETRIEVAL AND GENERATION: DEFINE THE RAG CHAIN ---
# This is where we connect the retriever (our vector store) to the LLM.

# A. Define the LLM
# We use a local Ollama model for generation.
llm = ChatOllama(model="llama3")
print("--- LLM Initialized (llama3) ---")

# B. Create a Prompt Template
# The prompt guides the LLM to answer questions based *only* on the provided context.
prompt = ChatPromptTemplate.from_template("""
Answer the following question based only on the provided context:

<context>
{context}
</context>

Question: {input}
""")

# C. Create the 'Stuff' Documents Chain
# This chain takes a list of documents, formats them into the prompt, and sends it to the LLM.
document_chain = create_stuff_documents_chain(llm, prompt)

# D. Create the Retriever
# The retriever fetches relevant documents from the vector store based on the user's query.
retriever = vector_store.as_retriever()
print("--- Retriever Created ---")

# E. Create the Full Retrieval Chain
# This chain combines the retriever and the document chain.
# 1. The user's query is passed to the retriever.
# 2. The retriever fetches relevant documents.
# 3. The documents and the query are passed to the document_chain to generate an answer.
retrieval_chain = create_retrieval_chain(retriever, document_chain)
print("--- RAG Chain Created ---")

# --- 5. ASK A QUESTION ---
question = "Who was the first person to walk on the moon, and who was with him?"

print(f"\n--- Querying the RAG chain with question: '{question}' ---")
response = retrieval_chain.invoke({"input": question})

# --- 6. PRINT THE RESPONSE ---
print("\n--- Answer ---")
print(response["answer"])

# To see the context that was retrieved, you can uncomment the following lines:
# print("\n--- Retrieved Context ---")
# for i, doc in enumerate(response["context"]):
#     print(f"Context {i+1}:\n{doc.page_content}\n")