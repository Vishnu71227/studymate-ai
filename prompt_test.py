from langchain_core.prompts import ChatPromptTemplate

prompt = ChatPromptTemplate.from_template(
    "You are a helpful AI/ML tutor. "
    "Explain {topic} in simple Hinglish with one example."
)

messages = prompt.format_messages(topic="RAG")

print(messages[0].content)
