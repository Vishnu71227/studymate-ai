
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS

# 1. Load the embedding model
embeddings = HuggingFaceEmbeddings(
    model_name="sentence-transformers/all-MiniLM-L6-v2"
)

# 2. Load the previously saved FAISS vector store
vector_store = FAISS.load_local(
    "faiss_index",
    embeddings,
    allow_dangerous_deserialization=True
)

# 3. Ask a question
question = "What is Junos OS?"

# 4. Search for the 3 most relevant chunks
results = vector_store.similarity_search(
    question,
    k=3
)

# 5. Display the results
for i, document in enumerate(results, start=1):
    print(f"\n--- RESULT {i} ---")
    print("Page:", document.metadata["page"])
    print("Content:")
    print(document.page_content)
