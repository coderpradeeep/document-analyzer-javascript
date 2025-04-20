import os
from openai import OpenAI

# Get API key from environment variable
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")

# Initialize OpenAI client
client = OpenAI(api_key=OPENAI_API_KEY)

def analyze_document(document_text, user_prompt):
    """
    Analyze a document using OpenAI GPT models based on user prompts.
    
    Args:
        document_text (str): The extracted text from the document
        user_prompt (str): The user's instructions for analysis
        
    Returns:
        str: The analysis result from the AI model
    """
    # Check if API key is available
    if not OPENAI_API_KEY:
        raise ValueError("OpenAI API key is missing. Please add it to your environment variables.")
    
    try:
        # Prepare text for processing - limit tokens if necessary
        # A rough estimate - GPT-4 can handle ~8000 tokens
        # This is approximate - roughly 4 chars per token for English
        max_chars = 32000  # ~8000 tokens
        truncated_text = document_text[:max_chars]
        
        if len(document_text) > max_chars:
            truncated_notice = "\n\n[Note: The document was truncated due to length limitations. Analysis is based on the first portion of the document.]"
        else:
            truncated_notice = ""
        
        # Create a system message that instructs the model how to analyze documents
        system_message = """
        You are an expert document analyst. Your task is to analyze documents and provide insights based on user instructions.
        Focus only on the content provided and avoid making assumptions beyond what's in the text.
        Structure your analysis clearly with appropriate headings, bullet points, or paragraphs.
        If the user asks for a summary, ensure it captures the key points while significantly reducing length.
        """
        
        # Create the user message combining the prompt and document
        user_message = f"User instructions: {user_prompt}\n\nDocument content:\n{truncated_text}"
        
        # the newest OpenAI model is "gpt-4o" which was released May 13, 2024.
        # do not change this unless explicitly requested by the user
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": system_message},
                {"role": "user", "content": user_message}
            ],
            temperature=0.3,  # Lower temperature for more focused/factual responses
            max_tokens=4000   # Limit the length of the response
        )
        
        # Extract and return the response text
        analysis = response.choices[0].message.content
        
        # Add truncation notice if applicable
        if truncated_notice:
            analysis += truncated_notice
            
        return analysis
        
    except Exception as e:
        raise Exception(f"Error during document analysis: {str(e)}")
