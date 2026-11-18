
from pypdf import PdfReader
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter

PDF_PATH = "data/Introduction to the Junos Operating System (IJOS).pdf"

# 1. Read PDF
reader = PdfReader(PDF_PATH)

# 2. Create one Document per PDF page
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

# 3. Split pages into smaller chunks
splitter = RecursiveCharacterTextSplitter(
    chunk_size=1000,
    chunk_overlap=150
)

chunks = splitter.split_documents(documents)

# 4. Display results
print("Total PDF pages:", len(reader.pages))
print("Pages with text:", len(documents))
print("Total chunks:", len(chunks))

for i, chunk in enumerate(chunks[:3], start=1):
    print(f"\n--- CHUNK {i} ---")
    print("Source page:", chunk.metadata["page"])
    print(chunk.page_content[:300])

