from dotenv import load_dotenv
from langchain_core.prompts import ChatPromptTemplate
from langchain_groq import ChatGroq

load_dotenv()

prompt = ChatPromptTemplate.from_template(
    "You are a helpful AI/ML tutor. "
    "Explain {topic} in simple english with one example."
)

model = ChatGroq(
    model="openai/gpt-oss-120b",
    temperature=0.3,
)

chain = prompt | model

response = chain.invoke({
    "topic": "Retrieval-Augmented Generation (RAG)"
})

print(response.content)
