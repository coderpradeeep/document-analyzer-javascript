import streamlit as st
import pandas as pd
import base64
import io
from document_processor import extract_text_from_docx, extract_text_from_pdf
from gemini_service import analyze_document

# Page configuration
st.set_page_config(
    page_title="Document Analyzer",
    page_icon="📄",
    layout="wide"
)

# Title and description
st.title("📄 Document Analyzer")
st.markdown("""
Upload a document (.docx or .pdf), and get AI-powered analysis and summaries based on your custom prompts.
""")

# Initialize session state variables if they don't exist
if 'extracted_text' not in st.session_state:
    st.session_state.extracted_text = None
if 'analysis_result' not in st.session_state:
    st.session_state.analysis_result = None
if 'file_name' not in st.session_state:
    st.session_state.file_name = None
if 'file_type' not in st.session_state:
    st.session_state.file_type = None

# File upload section
uploaded_file = st.file_uploader("Upload a document", type=['pdf', 'docx'])

if uploaded_file is not None:
    # Display file info
    file_size = len(uploaded_file.getvalue()) / 1024  # Convert to KB
    st.session_state.file_name = uploaded_file.name
    st.session_state.file_type = uploaded_file.type
    
    st.info(f"File uploaded: {uploaded_file.name} ({file_size:.2f} KB)")
    
    # Process file button
    if st.button("Extract Text"):
        with st.spinner("Extracting text from document..."):
            try:
                # Extract text based on file type
                if uploaded_file.name.endswith('.pdf'):
                    extracted_text = extract_text_from_pdf(uploaded_file)
                elif uploaded_file.name.endswith('.docx'):
                    extracted_text = extract_text_from_docx(uploaded_file)
                else:
                    st.error("Unsupported file format. Please upload a PDF or DOCX file.")
                    st.stop()
                
                # Check if text extraction was successful
                if not extracted_text or len(extracted_text.strip()) == 0:
                    st.error("Could not extract text from the document. The file might be encrypted, damaged, or contain only images.")
                    st.stop()
                
                # Store extracted text in session state
                st.session_state.extracted_text = extracted_text
                
                # Show success message and preview
                st.success("Text extracted successfully!")
                
                # Calculate word count
                word_count = len(extracted_text.split())
                st.write(f"Document contains approximately {word_count} words.")
                
                with st.expander("Preview extracted text"):
                    st.text_area("Extracted Content (preview)", 
                                value=extracted_text[:1000] + ("..." if len(extracted_text) > 1000 else ""), 
                                height=200, 
                                disabled=True)
            except Exception as e:
                st.error(f"Error processing file: {str(e)}")

# Analysis section (only shown if text has been extracted)
if st.session_state.extracted_text is not None:
    st.markdown("---")
    st.subheader("Document Analysis")
    
    # User prompt input
    user_prompt = st.text_area(
        "Enter your analysis instructions:",
        placeholder="Examples:\n- Summarize this document in 3 paragraphs\n- Extract the main arguments and supporting evidence\n- Identify key technical terms and provide definitions\n- What are the main conclusions of this document?",
        height=100
    )
    
    # Analysis button
    if st.button("Analyze Document"):
        if not user_prompt:
            st.warning("Please enter analysis instructions before proceeding.")
        else:
            with st.spinner("Analyzing document... This may take a minute depending on document length."):
                try:
                    # Send text and prompt to Gemini for analysis
                    analysis_result = analyze_document(st.session_state.extracted_text, user_prompt)
                    
                    # Store result in session state
                    st.session_state.analysis_result = analysis_result
                    
                    # Success message
                    st.success("Analysis complete!")
                except Exception as e:
                    st.error(f"Error during analysis: {str(e)}")
    
    # Display analysis results if available
    if st.session_state.analysis_result:
        st.markdown("### Analysis Results")
        st.markdown(st.session_state.analysis_result)
        
        # Option to download results
        if st.session_state.analysis_result and st.session_state.file_name:
            original_filename = st.session_state.file_name.rsplit('.', 1)[0]
            
            # Create a text file with the analysis
            result_text = f"Analysis of: {st.session_state.file_name}\n\n"
            result_text += f"Analysis Prompt: {user_prompt}\n\n"
            result_text += f"Results:\n{st.session_state.analysis_result}"
            
            # Convert to bytes for download
            b64 = base64.b64encode(result_text.encode()).decode()
            download_filename = f"{original_filename}_analysis.txt"
            
            # Create download button
            href = f'<a href="data:file/txt;base64,{b64}" download="{download_filename}">Download Analysis Results</a>'
            st.markdown(href, unsafe_allow_html=True)

# Add Footer
st.markdown("---")
st.markdown("Document Analyzer uses Google's Gemini model for document analysis.")
