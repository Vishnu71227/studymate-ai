import streamlit as st
from dotenv import load_dotenv
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
from pypdf import PdfReader
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter

load_dotenv()


# 1. Load resources only once
@st.cache_resource
def load_resources():

    model = ChatGroq(
        model="openai/gpt-oss-120b",
        temperature=0.2
    )

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

    chain = prompt | model

    return chain


# 2. Load embedding model only once
@st.cache_resource
def load_embeddings():

    embeddings = HuggingFaceEmbeddings(
        model_name="sentence-transformers/all-MiniLM-L6-v2"
    )

    return embeddings


# 3. Create vector store from uploaded PDF
def create_vector_store(uploaded_file):

    reader = PdfReader(uploaded_file)
    documents = []

    for page_number, page in enumerate(reader.pages, start=1):

        text = page.extract_text() or ""

        if text.strip():
            documents.append(
                Document(
                    page_content=text,
                    metadata={
                        "source": uploaded_file.name,
                        "page": page_number
                    }
                )
            )

    # Split PDF text into chunks
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=150
    )

    chunks = splitter.split_documents(documents)

    if not chunks:
        return None

    # Convert chunks into embeddings
    embeddings = load_embeddings()

    # Create FAISS vector store
    vector_store = FAISS.from_documents(
        chunks,
        embeddings
    )

    return vector_store


# 4. Load LLM chain
chain = load_resources()


# 5. Streamlit user interface
st.title("📚 AI PDF Study Assistant")

st.write("Upload a PDF and ask questions about its content!")


# PDF uploader
uploaded_file = st.file_uploader(
    "Upload your PDF",
    type=["pdf"]
)


# Process uploaded PDF
if uploaded_file is not None:

    if st.button("Process PDF"):

        with st.spinner("Processing your PDF..."):

            try:
                vector_store = create_vector_store(uploaded_file)

                if vector_store is None:
                    st.error("No readable text found in this PDF.")

                else:
                    st.session_state.vector_store = vector_store
                    st.session_state.processed_file = uploaded_file.name

                    st.success("PDF processed successfully!")

            except Exception as e:
                st.error(f"Error processing PDF: {e}")


# Initialize chat history
if "chat_history" not in st.session_state:
    st.session_state.chat_history = []


# 6. Ask questions after PDF processing
if "vector_store" in st.session_state:

    st.write(
        f"Currently loaded PDF: {st.session_state.processed_file}"
    )

    # Display previous conversations
    for chat in st.session_state.chat_history:

        with st.chat_message("user"):
            st.write(chat["question"])

        with st.chat_message("assistant"):
            st.write(chat["answer"])

    question = st.text_input(
        "Ask a question about your PDF"
    )

    if st.button("Get Answer"):

        if question.strip():

            with st.spinner("Finding your answer..."):

                try:
                    # Retrieve relevant chunks
                    documents = st.session_state.vector_store.similarity_search(
                        question,
                        k=3
                    )

                    # Combine retrieved chunks into context
                    context = "\n\n".join(
                        f"Page {doc.metadata.get('page', 'Unknown')}:\n"
                        f"{doc.page_content}"
                        for doc in documents
                    )

                    # Generate answer using LLM
                    response = chain.invoke({
                        "context": context,
                        "question": question
                    })

                    # Save conversation in chat history
                    st.session_state.chat_history.append({
                        "question": question,
                        "answer": response.content
                    })

                    st.subheader("AI Answer")
                    st.write(response.content)

                    # Display source page numbers
                    pages = sorted({
                        doc.metadata["page"]
                        for doc in documents
                        if "page" in doc.metadata
                    })

                    st.caption(
                        f"Retrieved source pages: {pages}"
                    )

                except Exception as e:
                    st.error(f"Error generating answer: {e}")

        else:
            st.warning("Please enter a question.")
