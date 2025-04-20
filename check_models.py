import os
import google.generativeai as genai

# Get API key from environment variable
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")

# Configure the Gemini API
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
else:
    print("API key not found. Please set the GEMINI_API_KEY environment variable.")
    exit(1)

# Get available models
models = genai.list_models()
print("Available models:")
for model in models:
    print(f"- {model.name}: {model.display_name}")
    print(f"  Supported generation methods: {', '.join(model.supported_generation_methods)}")
    print()