document.addEventListener('DOMContentLoaded', () => {
    // Tab switching with enhanced visual feedback
    const textTab = document.getElementById('text-tab');
    const pdfTab = document.getElementById('pdf-tab');
    const textContent = document.getElementById('text-content');
    const pdfContent = document.getElementById('pdf-content');
    
    textTab.addEventListener('click', () => {
        textTab.classList.add('active');
        pdfTab.classList.remove('active');
        textContent.classList.add('active');
        pdfContent.classList.remove('active');
    });
    
    pdfTab.addEventListener('click', () => {
        pdfTab.classList.add('active');
        textTab.classList.remove('active');
        pdfContent.classList.add('active');
        textContent.classList.remove('active');
    });
    
    // Enhanced file input experience
    const pdfFile = document.getElementById('pdf-file');
    const helpText = document.querySelector('.help-text');
    
    pdfFile.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.type === 'application/pdf') {
                // Update help text with file name and show loading message
                helpText.textContent = `Processing: ${file.name}`;
                helpText.style.color = '#3498db';
                helpText.style.fontWeight = '500';
                
                const reader = new FileReader();
                reader.onload = async function(event) {
                    const typedarray = new Uint8Array(event.target.result);
                    try {
                        // Initialize PDF.js
                        const loadingTask = pdfjsLib.getDocument({data: typedarray});
                        
                        // Add progress indicator for larger PDFs
                        loadingTask.onProgress = function(progress) {
                            const percent = Math.round(progress.loaded / progress.total * 100);
                            helpText.textContent = `Processing: ${file.name} (${percent}%)`;
                        };
                        
                        const pdf = await loadingTask.promise;
                        helpText.textContent = `Extracting text from ${pdf.numPages} pages...`;
                        
                        let textContent = '';
                        
                        // Extract text from each page
                        for (let i = 1; i <= pdf.numPages; i++) {
                            helpText.textContent = `Extracting text: page ${i} of ${pdf.numPages}`;
                            const page = await pdf.getPage(i);
                            const content = await page.getTextContent();
                            const strings = content.items.map(item => item.str);
                            textContent += strings.join(' ') + '\n';
                        }
                        
                        document.getElementById('paper-text').value = textContent;
                        
                        // Switch to text tab with animation
                        helpText.textContent = `PDF processed successfully: ${file.name}`;
                        helpText.style.color = '#1abc9c';
                        
                        // Pulse animation on textarea to draw attention
                        const paperText = document.getElementById('paper-text');
                        paperText.style.borderColor = '#1abc9c';
                        setTimeout(() => {
                            paperText.style.borderColor = '';
                            textTab.click(); // Switch to text tab to show the extracted content
                        }, 500);
                    } catch (error) {
                        console.error('Error processing PDF:', error);
                        helpText.textContent = 'Error processing PDF. Please try a different file.';
                        helpText.style.color = '#e74c3c';
                    }
                };
                reader.readAsArrayBuffer(file);
            } else {
                helpText.textContent = 'Please select a PDF file.';
                helpText.style.color = '#e74c3c';
                pdfFile.value = ''; // Clear the file input
            }
        }
    });
    
    // Enhanced summarize button with better feedback
    const summarizeBtn = document.getElementById('summarize-btn');
    const loadingSpinner = document.getElementById('loading');
    const summaryOutput = document.getElementById('summary-output');
    
    summarizeBtn.addEventListener('click', async () => {
        const paperText = document.getElementById('paper-text').value.trim();
        if (!paperText) {
            // Visual shake animation for error
            const textarea = document.getElementById('paper-text');
            textarea.classList.add('error-shake');
            setTimeout(() => textarea.classList.remove('error-shake'), 600);
            
            alert('Please enter or upload a paper to summarize');
            return;
        }
        
        const summaryLength = document.getElementById('summary-length').value;
        const focusAreas = Array.from(document.getElementById('focus-area').selectedOptions)
                             .map(option => option.value);
        
        // Update button state and show loading
        summarizeBtn.disabled = true;
        summarizeBtn.textContent = 'Processing...';
        loadingSpinner.style.display = 'block';
        summaryOutput.textContent = '';
        
        try {
            // Scroll to output section immediately to show loading
            document.querySelector('.output-section').scrollIntoView({
                behavior: 'smooth'
            });
            
            const response = await fetch('/api/summarize', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    text: paperText,
                    length: summaryLength,
                    focusAreas: focusAreas
                })
            });
            
            if (!response.ok) {
                throw new Error('Failed to summarize paper');
            }
            
            const data = await response.json();
            
            // Add a short delay to make the loading state more visible
            // This helps users perceive the processing happening
            setTimeout(() => {
                summaryOutput.textContent = data.summary;
                
                // Add a subtle highlight effect to the new content
                summaryOutput.style.backgroundColor = '#edf7fa';
                setTimeout(() => {
                    summaryOutput.style.backgroundColor = '';
                }, 500);
            }, 300);
            
        } catch (error) {
            console.error('Error:', error);
            summaryOutput.textContent = 'An error occurred while summarizing the paper. Please try again.';
            summaryOutput.style.color = '#e74c3c';
            
            // Reset color after a moment
            setTimeout(() => {
                summaryOutput.style.color = '';
            }, 3000);
        } finally {
            loadingSpinner.style.display = 'none';
            summarizeBtn.disabled = false;
            summarizeBtn.textContent = 'Summarize Paper';
        }
    });
    
    // Enhanced copy to clipboard with better visual feedback
    const copyBtn = document.getElementById('copy-btn');
    copyBtn.addEventListener('click', () => {
        const summaryText = document.getElementById('summary-output').textContent;
        
        if (summaryText.trim() === '') {
            copyBtn.classList.add('disabled');
            copyBtn.textContent = 'Nothing to copy';
            
            setTimeout(() => {
                copyBtn.classList.remove('disabled');
                copyBtn.textContent = 'Copy to Clipboard';
            }, 1500);
            
            return;
        }
        
        navigator.clipboard.writeText(summaryText)
            .then(() => {
                const originalText = copyBtn.textContent;
                copyBtn.style.backgroundColor = '#db7134';
                copyBtn.textContent = 'Copied to Clipboard ✓';
                
                setTimeout(() => {
                    copyBtn.textContent = originalText;
                    copyBtn.style.backgroundColor = '';
                }, 2000);
            })
            .catch(err => {
                console.error('Could not copy text: ', err);
                copyBtn.textContent = 'Failed to copy';
                copyBtn.style.backgroundColor = '#e74c3c';
                
                setTimeout(() => {
                    copyBtn.textContent = 'Copy to Clipboard';
                    copyBtn.style.backgroundColor = '';
                }, 2000);
            });
    });
    
    // Add interactive feedback for form elements
    const addFormInteractivity = () => {
        // Enhance select elements
        const selectElements = document.querySelectorAll('select');
        selectElements.forEach(select => {
            select.addEventListener('focus', function() {
                this.parentElement.style.color = '#3498db';
            });
            
            select.addEventListener('blur', function() {
                this.parentElement.style.color = '';
            });
        });
        
        // Enhance textarea
        const textarea = document.getElementById('paper-text');
        textarea.addEventListener('focus', function() {
            this.style.boxShadow = '0 0 0 2px #db7134';
        });
        
        textarea.addEventListener('blur', function() {
            this.style.boxShadow = '';
        });
        
        // Add character count to textarea
        textarea.addEventListener('input', function() {
            const charCount = this.value.length;
            let countLabel = document.getElementById('char-count');
            
            if (!countLabel) {
                countLabel = document.createElement('div');
                countLabel.id = 'char-count';
                countLabel.className = 'char-count';
                this.parentNode.appendChild(countLabel);
            }
            
            countLabel.textContent = `Characters: ${charCount}`;
            
            // Visual indication of content length
            if (charCount > 0) {
                countLabel.style.display = 'block';
            } else {
                countLabel.style.display = 'none';
            }
        });
    };
    
    // Initialize enhanced interactivity
    addFormInteractivity();
    
    // Add CSS for new interactive elements
    const addDynamicStyles = () => {
        const style = document.createElement('style');
        style.textContent = `
            @keyframes shake {
                0%, 100% { transform: translateX(0); }
                20%, 60% { transform: translateX(-5px); }
                40%, 80% { transform: translateX(5px); }
            }
            
            .error-shake {
                animation: shake 0.6s ease;
                border-color: #e74c3c !important;
            }
            
            .char-count {
                text-align: right;
                font-size: 12px;
                color: #7f8c8d;
                margin-top: -15px;
                margin-bottom: 15px;
                display: none;
            }
            
            .disabled {
                opacity: 0.6;
                cursor: not-allowed;
            }
            
            /* Additional transitions for buttons */
            button {
                position: relative;
                overflow: hidden;
            }
            
            button:after {
                content: '';
                position: absolute;
                top: 50%;
                left: 50%;
                width: 5px;
                height: 5px;
                background: rgba(255, 255, 255, 0.5);
                opacity: 0;
                border-radius: 100%;
                transform: scale(1, 1) translate(-50%);
                transform-origin: 50% 50%;
            }
            
            button:focus:not(:active)::after {
                animation: ripple 1s ease-out;
            }
            
            @keyframes ripple {
                0% {
                    transform: scale(0, 0);
                    opacity: 0.5;
                }
                20% {
                    transform: scale(25, 25);
                    opacity: 0.3;
                }
                100% {
                    opacity: 0;
                    transform: scale(40, 40);
                }
            }
        `;
        document.head.appendChild(style);
    };
    
    addDynamicStyles();
});