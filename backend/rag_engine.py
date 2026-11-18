
import io
from pathlib import Path

from dotenv import load_dotenv
from pypdf import PdfReader

from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_groq import ChatGroq


# Load .env from project root
BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")


# Global variables
vector_store = None

embeddings = HuggingFaceEmbeddings(
    model_name="sentence-transformers/all-MiniLM-L6-v2"
)


# Initialize Groq LLM
llm = ChatGroq(
    model="openai/gpt-oss-120b",
    temperature=0.2
)


# Process uploaded PDF and create FAISS database
def process_pdf(pdf_bytes, filename):

    global vector_store

    pdf_reader = PdfReader(io.BytesIO(pdf_bytes))

    documents = []

    for page_number, page in enumerate(pdf_reader.pages, start=1):

        text = page.extract_text() or ""

        if text.strip():
            documents.append(
                Document(
                    page_content=text,
                    metadata={
                        "source": filename,
                        "page": page_number
                    }
                )
            )

    if not documents:
        raise ValueError("No readable text found in PDF.")

    # Split documents into chunks
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200
    )

    chunks = text_splitter.split_documents(documents)

    # Create FAISS vector database
    vector_store = FAISS.from_documents(
        chunks,
        embeddings
    )

    return {
        "filename": filename,
        "total_pages": len(pdf_reader.pages),
        "total_chunks": len(chunks)
    }


# Stream answers from uploaded PDF
def stream_question(question):

    if vector_store is None:
        raise ValueError("Please upload a PDF first.")

    # Retrieve relevant chunks
    retriever = vector_store.as_retriever(
        search_kwargs={"k": 4}
    )

    relevant_docs = retriever.invoke(question)

    if not relevant_docs:
        yield "I could not find this information in the PDF."
        return

    # Prepare context with page numbers
    context = ""

    for doc in relevant_docs:

        page = doc.metadata.get("page", "Unknown")

        context += (
            f"\nPage {page}:\n"
            f"{doc.page_content}\n"
        )

    # Prepare messages for Groq
    messages = [
        (
            "system",
            "You are a helpful PDF Study Assistant. "
            "Answer the user's question using ONLY the "
            "provided PDF context. Do not use outside knowledge. "
            "If the answer is not available in the context, "
            "reply exactly: I could not find this information "
            "in the PDF. Mention relevant page numbers."
        ),
        (
            "human",
            f"PDF Context:\n{context}\n\n"
            f"Question: {question}"
        )
    ]

    # Generate response token by token
    for chunk in llm.stream(messages):

        if chunk.content:
            yield chunk.content
