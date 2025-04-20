// Initialize PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.12.313/pdf.worker.min.js';

// DOM Elements
const dropArea = document.getElementById('drop-area');
const fileInput = document.getElementById('file-input');
const browseButton = document.getElementById('browse-button');
const fileInfo = document.getElementById('file-info');
const fileName = document.getElementById('file-name');
const fileSize = document.getElementById('file-size');
const removeFileButton = document.getElementById('remove-file');
const extractButton = document.getElementById('extract-button');
const textPreviewSection = document.getElementById('text-preview-section');
const textPreview = document.getElementById('text-preview');
const wordCount = document.getElementById('word-count').querySelector('span');
const analysisSection = document.getElementById('analysis-section');
const userPrompt = document.getElementById('user-prompt');
const analyzeButton = document.getElementById('analyze-button');
const analysisResultsContainer = document.getElementById('analysis-results-container');
const analysisResults = document.getElementById('analysis-results');
const downloadButton = document.getElementById('download-button');
const loadingOverlay = document.getElementById('loading-overlay');
const loadingMessage = document.getElementById('loading-message');

// State variables
let currentFile = null;
let extractedText = '';

// Event listeners for file upload
browseButton.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', handleFileSelection);

// Drag and drop events
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, preventDefaults, false);
});

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

['dragenter', 'dragover'].forEach(eventName => {
    dropArea.addEventListener(eventName, () => {
        dropArea.classList.add('drag-over');
    }, false);
});

['dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, () => {
        dropArea.classList.remove('drag-over');
    }, false);
});

dropArea.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    const files = dt.files;
    
    if (files.length) {
        fileInput.files = files;
        handleFileSelection();
    }
}, false);

// Remove file button
removeFileButton.addEventListener('click', () => {
    resetFileUpload();
});

// Extract text button
extractButton.addEventListener('click', async () => {
    if (!currentFile) return;
    
    showLoading('Extracting text from document...');
    
    try {
        if (currentFile.name.endsWith('.pdf')) {
            extractedText = await extractTextFromPDF(currentFile);
        } else if (currentFile.name.endsWith('.docx')) {
            extractedText = await extractTextFromDOCX(currentFile);
        }
        
        // Check if text extraction was successful
        if (!extractedText || extractedText.trim() === '') {
            alert('Could not extract text from the document. The file might be encrypted, damaged, or contain only images.');
            hideLoading();
            return;
        }
        
        // Display text preview
        displayTextPreview(extractedText);
        
        // Show analysis section
        analysisSection.classList.remove('hidden');
        
        hideLoading();
    } catch (error) {
        console.error('Error extracting text:', error);
        alert(`Error processing file: ${error.message}`);
        hideLoading();
    }
});

// Analyze button
analyzeButton.addEventListener('click', async () => {
    if (!extractedText) {
        alert('Please extract text from a document first.');
        return;
    }
    
    const prompt = userPrompt.value.trim();
    if (!prompt) {
        alert('Please enter analysis instructions before proceeding.');
        return;
    }
    
    showLoading('Analyzing document... This may take a minute depending on document length.');
    
    try {
        const result = await analyzeDocument(extractedText, prompt);
        
        // Display analysis results
        analysisResults.innerHTML = formatAnalysisResult(result);
        analysisResultsContainer.classList.remove('hidden');
        
        hideLoading();
    } catch (error) {
        console.error('Error analyzing document:', error);
        alert(`Error during analysis: ${error.message}`);
        hideLoading();
    }
});

// Download button
downloadButton.addEventListener('click', () => {
    if (!extractedText || !analysisResults.innerHTML) return;
    
    const result = analysisResults.innerText;
    const prompt = userPrompt.value;
    const filename = currentFile ? currentFile.name : 'document';
    
    // Create text content
    const content = `Analysis of: ${filename}\n\nAnalysis Prompt: ${prompt}\n\nResults:\n${result}`;
    
    // Create download link
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(content));
    element.setAttribute('download', `${filename.split('.')[0]}_analysis.txt`);
    element.style.display = 'none';
    
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
});

// File handling functions
function handleFileSelection() {
    if (fileInput.files.length === 0) return;
    
    const file = fileInput.files[0];
    
    // Check if file is PDF or DOCX
    if (!file.name.endsWith('.pdf') && !file.name.endsWith('.docx')) {
        alert('Please select a PDF or DOCX file.');
        return;
    }
    
    // Update UI
    currentFile = file;
    fileName.textContent = file.name;
    fileSize.textContent = formatFileSize(file.size);
    fileInfo.classList.remove('hidden');
    extractButton.classList.remove('hidden');
    
    // Reset previous results
    textPreviewSection.classList.add('hidden');
    analysisSection.classList.add('hidden');
    analysisResultsContainer.classList.add('hidden');
    extractedText = '';
}

function resetFileUpload() {
    fileInput.value = '';
    currentFile = null;
    fileInfo.classList.add('hidden');
    extractButton.classList.add('hidden');
    textPreviewSection.classList.add('hidden');
    analysisSection.classList.add('hidden');
    extractedText = '';
}

function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' bytes';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(2) + ' KB';
    else return (bytes / 1048576).toFixed(2) + ' MB';
}

// Text extraction functions
async function extractTextFromPDF(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = async function(event) {
            try {
                const typedArray = new Uint8Array(event.target.result);
                const pdf = await pdfjsLib.getDocument({ data: typedArray }).promise;
                let text = '';
                
                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const content = await page.getTextContent();
                    const pageText = content.items.map(item => item.str).join(' ');
                    text += pageText + '\n\n';
                }
                
                resolve(text);
            } catch (error) {
                reject(new Error(`Error extracting text from PDF: ${error.message}`));
            }
        };
        
        reader.onerror = function() {
            reject(new Error('Failed to read the file'));
        };
        
        reader.readAsArrayBuffer(file);
    });
}

async function extractTextFromDOCX(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = async function(event) {
            try {
                const arrayBuffer = event.target.result;
                
                // Use docx.js to extract text
                const doc = new docx.Document(arrayBuffer);
                const text = doc.getText();
                
                resolve(text);
            } catch (error) {
                reject(new Error(`Error extracting text from DOCX: ${error.message}`));
            }
        };
        
        reader.onerror = function() {
            reject(new Error('Failed to read the file'));
        };
        
        reader.readAsArrayBuffer(file);
    });
}

// Display functions
function displayTextPreview(text) {
    // Calculate word count
    const words = text.split(/\s+/).filter(word => word.length > 0);
    wordCount.textContent = words.length;
    
    // Display preview (first 1000 characters)
    const previewText = text.length > 1000 ? text.substring(0, 1000) + '...' : text;
    textPreview.textContent = previewText;
    
    // Show text preview section
    textPreviewSection.classList.remove('hidden');
}

function formatAnalysisResult(text) {
    // Simple formatting: convert line breaks to HTML paragraphs
    // This could be enhanced with a proper markdown parser
    return text
        .split('\n\n')
        .map(paragraph => {
            // Check if paragraph is a heading
            if (paragraph.startsWith('# ')) {
                return `<h3>${paragraph.substring(2)}</h3>`;
            } else if (paragraph.startsWith('## ')) {
                return `<h4>${paragraph.substring(3)}</h4>`;
            } else if (paragraph.trim().length > 0) {
                return `<p>${paragraph}</p>`;
            }
            return '';
        })
        .join('');
}

// API interaction
async function analyzeDocument(documentText, userPrompt) {
    try {
        // Send the text and prompt to our backend API
        const response = await fetch('/api/analyze', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                text: documentText,
                prompt: userPrompt
            }),
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Error connecting to analysis service');
        }
        
        const data = await response.json();
        return data.analysis;
    } catch (error) {
        console.error('API error:', error);
        throw error;
    }
}

// Loading state management
function showLoading(message) {
    loadingMessage.textContent = message || 'Processing...';
    loadingOverlay.classList.remove('hidden');
}

function hideLoading() {
    loadingOverlay.classList.add('hidden');
}