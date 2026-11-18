from pypdf import PdfReader

# Open the PDF file
reader = PdfReader("data/Introduction to the Junos Operating System (IJOS).pdf")

# Count total pages
print("Total pages:", len(reader.pages))

# Extract text from every page
for page_number, page in enumerate(reader.pages, start=1):
    text = page.extract_text() or ""

    print(f"\n--- Page {page_number} ---")
    print(text)
