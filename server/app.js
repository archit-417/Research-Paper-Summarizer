const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const axios = require('axios'); // You'll need to install this: npm install axios
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, '../')));

// Helper function to chunk text to fit token limits
function chunkText(text, maxChunkSize = 8000) {
    const chunks = [];
    let currentChunk = '';
    
    const sentences = text.split(/(?<=[.!?])\s+/);
    
    for (const sentence of sentences) {
        if (currentChunk.length + sentence.length > maxChunkSize) {
            chunks.push(currentChunk);
            currentChunk = sentence;
        } else {
            currentChunk += (currentChunk ? ' ' : '') + sentence;
        }
    }
    
    if (currentChunk) {
        chunks.push(currentChunk);
    }
    
    return chunks;
}

// Function to call Hugging Face API
async function callHuggingFaceAPI(text, options = {}) {
    try {
        const API_URL = process.env.HUGGINGFACE_API_URL || 
                       "https://api-inference.huggingface.co/models/facebook/bart-large-cnn";
        
        // Create parameters with better defaults
        const parameters = {
            // Only include max_length if we have a specific value
            ...(options.maxLength && { max_length: options.maxLength }),
            ...(options.minLength && { min_length: options.minLength }),
            // Add other helpful parameters
            do_sample: false,
            truncation: true,  // Explicitly enable truncation
            max_time: 30  // Limit processing time to 30 seconds
        };
        
        console.log("Sending request to Hugging Face with parameters:", parameters);
        
        const response = await axios.post(
            API_URL,
            { 
                inputs: text,
                parameters: parameters
            },
            {
                headers: {
                    "Authorization": `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
                    "Content-Type": "application/json"
                }
            }
        );
        
        if (response.data && response.data[0] && response.data[0].summary_text) {
            return response.data[0].summary_text;
        } else {
            console.log("Unexpected response format:", response.data);
            return "Error: Unexpected response format from API";
        }
    } catch (error) {
        console.error("Hugging Face API error:", error.response?.data || error.message);
        throw error;
    }
}

// Summarize endpoint
app.post('/api/summarize', async (req, res) => {
    try {
        const { text, length, focusAreas } = req.body;
        
        if (!text) {
            return res.status(400).json({ error: 'No text provided' });
        }
        
        // For very large texts, use smaller chunk sizes
        const maxChunkSize = text.length > 50000 ? 4000 : 8000;
        const chunks = chunkText(text, maxChunkSize);
        
        console.log(`Processing ${chunks.length} chunks of text`);
        
        // Determine length parameters based on requested summary length
        let maxTokens;
        switch (length) {
            case 'short': maxTokens = 150; break;
            case 'long': maxTokens = 400; break;
            default: maxTokens = 250; // medium
        }
        
        // For large documents with many chunks, process strategically
        let chunkSummaries = [];
        
        // If we have too many chunks, summarize them in batches
        if (chunks.length > 5) {
            console.log("Large document detected, processing in batches");
            
            // First summarize each chunk individually
            for (let i = 0; i < chunks.length; i++) {
                console.log(`Processing chunk ${i+1} of ${chunks.length}...`);
                
                // Add focus instruction only to first chunk
                let processedChunk = chunks[i];
                if (i === 0 && focusAreas && focusAreas.length) {
                    processedChunk = `Focus on these aspects: ${focusAreas.join(', ')}. ${processedChunk}`;
                }
                
                try {
                    const summary = await callHuggingFaceAPI(processedChunk, {
                        // Don't specify max_length for the initial individual chunks
                        // to avoid the truncation error
                        minLength: 50
                    });
                    chunkSummaries.push(summary);
                } catch (err) {
                    console.error(`Error processing chunk ${i+1}:`, err);
                    // If a chunk fails, add a placeholder and continue
                    chunkSummaries.push(`[This section could not be summarized due to an error]`);
                }
            }
        } else {
            // For smaller documents, process chunks normally
            for (let i = 0; i < chunks.length; i++) {
                console.log(`Processing chunk ${i+1} of ${chunks.length}...`);
                
                let processedChunk = chunks[i];
                if (i === 0 && focusAreas && focusAreas.length) {
                    processedChunk = `Focus on these aspects: ${focusAreas.join(', ')}. ${processedChunk}`;
                }
                
                const summary = await callHuggingFaceAPI(processedChunk, {
                    maxLength: maxTokens,
                    minLength: Math.floor(maxTokens / 3)
                });
                
                chunkSummaries.push(summary);
            }
        }
        
        // Combine the summaries
        let finalSummary;
        
        if (chunkSummaries.length > 1) {
            // For many summaries, combine them in batches if needed
            if (chunkSummaries.length > 5) {
                // Combine in batches of 5
                const batchedSummaries = [];
                for (let i = 0; i < chunkSummaries.length; i += 5) {
                    const batch = chunkSummaries.slice(i, i + 5);
                    const batchText = batch.join("\n\n");
                    const batchSummary = await callHuggingFaceAPI(batchText, {
                        maxLength: 300,
                        minLength: 100
                    });
                    batchedSummaries.push(batchSummary);
                }
                
                // Combine the batched summaries
                const combinedBatches = batchedSummaries.join("\n\n");
                finalSummary = await callHuggingFaceAPI(combinedBatches, {
                    maxLength: maxTokens * 1.5,
                    minLength: maxTokens
                });
            } else {
                // Combine a smaller number of summaries directly
                const combinedText = chunkSummaries.join("\n\n");
                finalSummary = await callHuggingFaceAPI(combinedText, {
                    maxLength: maxTokens * 1.5,
                    minLength: maxTokens
                });
            }
        } else {
            finalSummary = chunkSummaries[0];
        }
        
        res.json({ summary: finalSummary });
        
    } catch (error) {
        console.error('Error:', error);
        const errorMessage = error.response?.data?.error || 'Failed to summarize text';
        res.status(500).json({ error: errorMessage });
    }
});

// List available Hugging Face models (optional)
app.get('/api/available-models', async (req, res) => {
    try {
        // This is a simple endpoint that lists some recommended summarization models
        // Hugging Face doesn't have a direct API to list all available models
        const recommendedModels = [
            {
                id: "facebook/bart-large-cnn",
                description: "BART model fine-tuned on CNN Daily Mail dataset for summarization"
            },
            {
                id: "google/pegasus-xsum",
                description: "Pegasus model fine-tuned on XSum dataset for extreme summarization"
            },
            {
                id: "sshleifer/distilbart-cnn-12-6",
                description: "Distilled version of BART for faster and lighter summarization"
            },
            {
                id: "philschmid/bart-large-cnn-samsum",
                description: "BART model fine-tuned on the SAMSum dataset for dialogue summarization"
            }
        ];
        
        res.json(recommendedModels);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Failed to fetch models' });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});