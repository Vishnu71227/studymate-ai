from pypdf import PdfReader
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS

PDF_PATH = "data/Introduction to the Junos Operating System (IJOS).pdf"

# 1. Read the PDF
reader = PdfReader(PDF_PATH)
documents = []

for page_number, page in enumerate(reader.pages, start=1):
    text = page.extract_text() or ""

    if text.strip():
        documents.append(
            Document(
                page_content=text,
                metadata={
                    "source": PDF_PATH,
                    "page": page_number
                }
            )
        )

# 2. Split PDF text into chunks
splitter = RecursiveCharacterTextSplitter(
    chunk_size=1000,
    chunk_overlap=150
)

chunks = splitter.split_documents(documents)

# 3. Load a local embedding model
embeddings = HuggingFaceEmbeddings(
    model_name="sentence-transformers/all-MiniLM-L6-v2"
)

# 4. Convert chunks into vectors and store them in FAISS
vector_store = FAISS.from_documents(chunks, embeddings)

# 5. Save the vector store locally
vector_store.save_local("faiss_index")

print("Total chunks:", len(chunks))
print("Vector store created and saved successfully!")
