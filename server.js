const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Environment variables
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Initialize Google Generative AI
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// Initialize Express app
const app = express();
const port = 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// Configure multer for file uploads
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    }
});

// Serve static files
app.use(express.static(__dirname));

// API Endpoints
app.post('/api/analyze', async (req, res) => {
    try {
        const { text, prompt } = req.body;
        
        if (!text || !prompt) {
            return res.status(400).json({ error: 'Missing required parameters: text and prompt' });
        }
        
        // Check API key
        if (!GEMINI_API_KEY) {
            return res.status(500).json({ error: 'API key is missing' });
        }
        
        // Limit text if needed (Gemini has token limits)
        const maxChars = 30000;
        const truncatedText = text.length > maxChars ? text.substring(0, maxChars) : text;
        
        // Prepare system message and user prompt
        const systemMessage = `
            You are an expert document analyst. Your task is to analyze documents and provide insights based on user instructions.
            Focus only on the content provided and avoid making assumptions beyond what's in the text.
            Structure your analysis clearly with appropriate headings, bullet points, or paragraphs.
            If the user asks for a summary, ensure it captures the key points while significantly reducing length.
        `;
        
        const userMessage = `User instructions: ${prompt}\n\nDocument content:\n${truncatedText}`;
        const combinedMessage = `${systemMessage}\n\n${userMessage}`;
        
        // Initialize Gemini model
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        
        // Generate content with Gemini
        const result = await model.generateContent(combinedMessage);
        const response = result.response;
        
        // Add truncation notice if applicable
        let analysisText = response.text();
        if (text.length > maxChars) {
            analysisText += "\n\n[Note: The document was truncated due to length limitations. Analysis is based on the first portion of the document.]";
        }
        
        return res.json({ analysis: analysisText });
    } catch (error) {
        console.error('Analysis error:', error);
        return res.status(500).json({ error: `Error during analysis: ${error.message}` });
    }
});

// Main route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server
app.listen(port, '0.0.0.0', () => {
    console.log(`Document Analyzer server running at http://0.0.0.0:${port}`);
});