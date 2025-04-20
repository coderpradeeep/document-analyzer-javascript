import os
import google.generativeai as genai

# Get API key from environment variable
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")

# Configure the Gemini API
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

def analyze_document(document_text, user_prompt):
    """
    Analyze a document using Google's Gemini model based on user prompts.
    
    Args:
        document_text (str): The extracted text from the document
        user_prompt (str): The user's instructions for analysis
        
    Returns:
        str: The analysis result from the AI model
    """
    # Check if API key is available
    if not GEMINI_API_KEY:
        raise ValueError("Gemini API key is missing. Please add it to your environment variables.")
    
    try:
        # Prepare text for processing - limit tokens if necessary
        # Gemini has token limits too, so we'll limit the text
        max_chars = 30000  # Approximate limit
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
        
        # Initialize Gemini model
        model = genai.GenerativeModel('gemini-pro')
        
        # Generate content with Gemini
        response = model.generate_content(
            [
                {"role": "user", "parts": [system_message]},
                {"role": "user", "parts": [user_message]}
            ],
            generation_config={
                "temperature": 0.3,  # Lower temperature for more focused/factual responses
                "max_output_tokens": 4000,  # Limit the length of the response
                "top_p": 0.95,
                "top_k": 40,
            }
        )
        
        # Extract and return the response text
        analysis = response.text
        
        # Add truncation notice if applicable
        if truncated_notice:
            analysis += truncated_notice
            
        return analysis
        
    except Exception as e:
        raise Exception(f"Error during document analysis: {str(e)}")