
from dotenv import load_dotenv
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS

# 1. Load environment variables from .env
load_dotenv()

# 2. Load the embedding model
embeddings = HuggingFaceEmbeddings(
    model_name="sentence-transformers/all-MiniLM-L6-v2"
)

# 3. Load the saved vector store
vector_store = FAISS.load_local(
    "faiss_index",
    embeddings,
    allow_dangerous_deserialization=True
)

# 4. Create the LLM
model = ChatGroq(
    model="openai/gpt-oss-120b",
    temperature=0.2
)

# 5. Create the prompt template
prompt = ChatPromptTemplate.from_template("""
You are a helpful PDF study assistant.

Answer the question using only the provided context.
If the context does not contain the answer, say:
"I could not find this information in the PDF."

Explain in simple English.

Include the source page number when possible.

Context:
{context}

Question:
{question}
""")

# 6. Connect the prompt and the LLM
chain = prompt | model

# 7. Get the user's question
while True:
    question = input(
        "\nAsk a question about your PDF (or type 'exit'): "
    )

    if question.lower() == "exit":
        print("Goodbye!")
        break

    # 8. Retrieve relevant chunks from FAISS
    documents = vector_store.similarity_search(
        question,
        k=3
    )

    # 9. Combine retrieved text into context
    context = "\n\n".join(
        f"Page {doc.metadata.get('page', 'Unknown')}:\n"
        f"{doc.page_content}"
        for doc in documents
    )

    # 10. Generate the answer
    response = chain.invoke({
        "context": context,
        "question": question
    })

    # 11. Display answer and source pages
    print("\nAI Answer:")
    print(response.content)

    pages = sorted({
        doc.metadata["page"]
        for doc in documents
        if "page" in doc.metadata
    })

    print("\nRetrieved source pages:", pages)

