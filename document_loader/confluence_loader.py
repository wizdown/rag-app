import os
import warnings
from typing import List, Optional
from langchain_community.document_loaders import ConfluenceLoader
from langchain_community.embeddings import OllamaEmbeddings
from langchain_community.chat_models import ChatOllama
from langchain_postgres import PGVector
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.chains.combine_documents import create_stuff_documents_chain
from langchain.chains import create_retrieval_chain
from langchain_core.prompts import ChatPromptTemplate
from sqlalchemy import create_engine, text, inspect

# Suppress warnings
warnings.filterwarnings('ignore')

class ConfluenceRAGApp:
    def __init__(self, 
                 confluence_url: str,
                 username: str,
                 api_token: str,
                 space_keys: List[str],
                 db_connection_string: str,
                 ollama_host: str = "localhost",
                 ollama_port: str = "11434"):
        """
        Initialize the Confluence RAG application.
        
        Args:
            confluence_url: Base URL of your Confluence instance
            username: Confluence username/email
            api_token: Confluence API token
            space_keys: List of Confluence space keys to load
            db_connection_string: PostgreSQL connection string with pgvector
            ollama_host: Ollama server host
            ollama_port: Ollama server port
        """
        self.confluence_url = confluence_url
        self.username = username
        self.api_token = api_token
        self.space_keys = space_keys
        self.db_connection_string = db_connection_string
        self.ollama_url = f"http://{ollama_host}:{ollama_port}"
        
        # Initialize components
        self._initialize_components()
        
    def _initialize_components(self):
        """Initialize LangChain components."""
        print("Initializing LangChain components...")
        
        # Initialize Ollama models
        self.llm = ChatOllama(model="llama3.2:1b", base_url=self.ollama_url)
        self.embeddings = OllamaEmbeddings(model="nomic-embed-text", base_url=self.ollama_url)
        
        # Initialize database connection
        self.engine = create_engine(self.db_connection_string)
        self.inspector = inspect(self.engine)
        
        # Initialize text splitter
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=500, 
            chunk_overlap=50
        )
        
        # Initialize prompt template
        self.prompt = ChatPromptTemplate.from_template("""
        Answer the following question based only on the provided context. 
        If you cannot answer the question from the context, just say 'I don't have enough information to answer that question'. 
        Don't make up any information.

        <context>
        {context}
        </context>

        Question: {input}
        """)
        
        # Create document chain
        self.document_chain = create_stuff_documents_chain(self.llm, self.prompt)
        
        print("Components initialized successfully!")
    
    def load_confluence_data(self, collection_name: str = "confluence_docs"):
        """
        Load data from Confluence spaces and store in PostgreSQL with pgvector.
        
        Args:
            collection_name: Name of the collection in the vector store
        """
        print(f"Loading data from Confluence spaces: {self.space_keys}")
        
        all_documents = []
        
        for space_key in self.space_keys:
            try:
                print(f"Loading documents from space: {space_key}")
                
                # Initialize Confluence loader
                loader = ConfluenceLoader(
                    url=self.confluence_url,
                    username=self.username,
                    api_token=self.api_token,
                    space_key=space_key
                )
                
                # Load documents
                documents = loader.load()
                all_documents.extend(documents)
                print(f"Loaded {len(documents)} documents from space {space_key}")
                
            except Exception as e:
                print(f"Error loading from space {space_key}: {e}")
                continue
        
        if not all_documents:
            print("No documents loaded from Confluence!")
            return
        
        print(f"Total documents loaded: {len(all_documents)}")
        
        # Split documents into chunks
        print("Splitting documents into chunks...")
        split_docs = self.text_splitter.split_documents(all_documents)
        print(f"Created {len(split_docs)} document chunks")
        
        # Store in PostgreSQL with pgvector
        print(f"Storing documents in PostgreSQL collection: {collection_name}")
        try:
            PGVector.from_documents(
                embedding=self.embeddings,
                documents=split_docs,
                collection_name=collection_name,
                connection=self.db_connection_string,
                pre_delete_collection=True,  # Replace existing collection
            )
            print(f"Successfully stored {len(split_docs)} document chunks in collection: {collection_name}")
            
        except Exception as e:
            print(f"Error storing documents in database: {e}")
            raise
    
    def askQuery(self, query: str, collection_name: str = "confluence_docs") -> str:
        """
        Ask a question and get an answer based on the loaded Confluence data.
        
        Args:
            query: The question to ask
            collection_name: Name of the collection to search in
            
        Returns:
            Answer to the question
        """
        print(f"Processing query: {query}")
        
        try:
            # Create vector store and retriever
            vector_store = PGVector(
                embeddings=self.embeddings,
                collection_name=collection_name,
                connection=self.db_connection_string,
            )
            
            retriever = vector_store.as_retriever()
            
            # Check if we have relevant documents
            relevant_docs = retriever.get_relevant_documents(query)
            
            if not relevant_docs:
                return "I don't have enough information to answer that question."
            
            # Create retrieval chain
            retrieval_chain = create_retrieval_chain(retriever, self.document_chain)
            
            # Get answer
            response = retrieval_chain.invoke({"input": query})
            answer = response['answer']
            
            print(f"Generated answer: {answer}")
            return answer
            
        except Exception as e:
            print(f"Error processing query: {e}")
            return f"Error processing your question: {str(e)}"
    
    def list_collections(self) -> List[str]:
        """List all available collections in the database."""
        try:
            collection_table_name = "langchain_pg_collection"
            if not self.inspector.has_table(collection_table_name):
                return []
            
            with self.engine.connect() as connection:
                query = text(f"SELECT name FROM {collection_table_name}")
                result = connection.execute(query)
                collections = [row[0] for row in result]
            
            return collections
        except Exception as e:
            print(f"Error listing collections: {e}")
            return []


def main():
    """Main method to demonstrate the RAG application."""
    
    # Configuration - Replace with your actual values
    CONFLUENCE_URL = os.getenv("CONFLUENCE_URL", "https://your-company.atlassian.net")
    CONFLUENCE_USERNAME = os.getenv("CONFLUENCE_USERNAME", "your.email@company.com")
    CONFLUENCE_API_TOKEN = os.getenv("CONFLUENCE_API_TOKEN", "your_api_token")
    SPACE_KEYS = os.getenv("CONFLUENCE_SPACE_KEYS", "SPACE1,SPACE2").split(",")
    DB_CONNECTION_STRING = os.getenv("PG_VECTOR_DATABASE_URL", "postgresql://user:password@localhost:5432/vectordb")
    
    # Initialize the RAG application
    print("Initializing Confluence RAG Application...")
    rag_app = ConfluenceRAGApp(
        confluence_url=CONFLUENCE_URL,
        username=CONFLUENCE_USERNAME,
        api_token=CONFLUENCE_API_TOKEN,
        space_keys=SPACE_KEYS,
        db_connection_string=DB_CONNECTION_STRING
    )
    
    # Load data from Confluence (uncomment to load data)
    # print("\nLoading data from Confluence...")
    # rag_app.load_confluence_data()
    
    # Example queries
    example_queries = [
        "What is the project overview?",
        "How do I set up the development environment?",
        "What are the API endpoints?",
        "What is the deployment process?"
    ]
    
    print("\n" + "="*50)
    print("EXAMPLE QUERIES")
    print("="*50)
    
    for query in example_queries:
        print(f"\nQuestion: {query}")
        answer = rag_app.askQuery(query)
        print(f"Answer: {answer}")
        print("-" * 30)
    
    # Interactive mode
    print("\n" + "="*50)
    print("INTERACTIVE MODE")
    print("="*50)
    print("Type 'quit' to exit")
    
    while True:
        try:
            user_query = input("\nEnter your question: ").strip()
            if user_query.lower() in ['quit', 'exit', 'q']:
                break
            
            if user_query:
                answer = rag_app.askQuery(user_query)
                print(f"Answer: {answer}")
                
        except KeyboardInterrupt:
            print("\nExiting...")
            break
        except Exception as e:
            print(f"Error: {e}")


if __name__ == "__main__":
    main()
