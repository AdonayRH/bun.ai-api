// ========================================
// Chat Application Script with Artifacts
// ========================================

const messagesArea = document.getElementById('messagesArea');
const chatForm = document.getElementById('chatForm');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');
const artifactsPanel = document.getElementById('artifactsPanel');

// Conversation history
let conversationHistory = [];

// Markdown configuration
marked.setOptions({
    highlight: function (code, lang) {
        if (Prism.languages[lang]) {
            return Prism.highlight(code, Prism.languages[lang], lang);
        } else {
            return code;
        }
    },
    breaks: true
});

// Initialize particles
function initParticles() {
    const particlesContainer = document.getElementById('particles');
    const particleCount = 30;

    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = `${Math.random() * 100}%`;
        particle.style.animationDuration = `${15 + Math.random() * 20}s`;
        particle.style.animationDelay = `${Math.random() * 15}s`;
        particle.style.width = `${2 + Math.random() * 4}px`;
        particle.style.height = particle.style.width;
        particlesContainer.appendChild(particle);
    }
}

// Auto-resize textarea
function autoResize() {
    messageInput.style.height = 'auto';
    messageInput.style.height = Math.min(messageInput.scrollHeight, 120) + 'px';
}

messageInput.addEventListener('input', autoResize);

// Handle Enter key (Shift+Enter for new line)
messageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        chatForm.dispatchEvent(new Event('submit'));
    }
});

// Create message element
function createMessage(role, content = '') {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}`;

    const avatarSvg = role === 'user'
        ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
           </svg>`
        : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"/>
           </svg>`;

    messageDiv.innerHTML = `
        <div class="message-avatar">${avatarSvg}</div>
        <div class="message-content">${content ? marked.parse(content) : ''}</div>
    `;

    return messageDiv;
}

// Create typing indicator
function createTypingIndicator() {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message assistant';
    messageDiv.id = 'typingMessage';

    messageDiv.innerHTML = `
        <div class="message-avatar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"/>
            </svg>
        </div>
        <div class="message-content">
            <div class="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
            </div>
        </div>
    `;

    return messageDiv;
}

// Scroll to bottom
function scrollToBottom() {
    messagesArea.scrollTop = messagesArea.scrollHeight;
}

// Remove welcome message & empty state
function removePlaceholders() {
    const welcome = document.querySelector('.welcome-message');
    if (welcome) {
        welcome.style.opacity = '0';
        welcome.style.transform = 'translateY(-20px)';
        setTimeout(() => welcome.remove(), 300);
    }

    // Don't remove artifact empty state yet, wait for first artifact
}

function clearArtifactsEmptyState() {
    const emptyState = document.querySelector('.empty-state');
    if (emptyState) {
        emptyState.remove();
    }
}

// --- Artifact Handling ---

function addArtifact(code, language) {
    clearArtifactsEmptyState();

    // Create artifact card
    const card = document.createElement('div');
    card.className = 'artifact-card';

    // Header
    const header = document.createElement('div');
    header.className = 'artifact-header';
    header.innerHTML = `
        <div class="artifact-title">
            <span class="artifact-lang">${language || 'text'}</span>
            <span>Snippet</span>
        </div>
        <div class="artifact-actions">
            <button class="copy-button" title="Copy code">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                    <path d="M8 2H16C18.2 2 20 3.8 20 6V18C20 20.2 18.2 22 16 22H8C5.8 22 4 20.2 4 18V6C4 3.8 5.8 2 8 2ZM8 6V18H16V6H8Z"/>
                </svg>
            </button>
        </div>
    `;

    // Copy functionality
    const copyBtn = header.querySelector('.copy-button');
    copyBtn.onclick = () => {
        navigator.clipboard.writeText(code);
        copyBtn.style.color = '#22c55e'; // Green feedback
        setTimeout(() => copyBtn.style.color = '', 1000);
    };

    // Content
    const content = document.createElement('pre');
    content.className = 'artifact-content';
    const codeEl = document.createElement('code');
    codeEl.className = language ? `language-${language}` : 'language-none';
    codeEl.textContent = code;

    content.appendChild(codeEl);
    card.appendChild(header);
    card.appendChild(content);

    // Add to top of artifacts list
    artifactsPanel.insertBefore(card, artifactsPanel.firstChild);

    // Highlight syntax
    Prism.highlightElement(codeEl);
}

// Process response text to detect and extract code blocks
// This is a simplified version: it extracts COMPLETED code blocks
// A more advanced version would stream the code block updates
function processArtifacts(fullText) {
    // Regex to find markdown code blocks: ```lang ... ```
    // We use a specific approach to find *new* blocks that haven't been added yet requires state
    // For simplicity in this iteration: We parse the FULL text at the end of the stream
    // and replace the panel content? No, that would flash.

    // Better approach for "Streaming Artifacts": 
    // Just maintain a list of extracted blocks. When a block is "closed" in the stream, we add it.
}

// Handle form submission
chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const message = messageInput.value.trim();
    if (!message) return;

    removePlaceholders();

    // Add user message
    const userMessage = createMessage('user', message);
    messagesArea.appendChild(userMessage);
    scrollToBottom();
    conversationHistory.push({ role: 'user', content: message });

    messageInput.value = '';
    autoResize();
    messageInput.disabled = true;
    sendButton.disabled = true;

    const typingIndicator = createTypingIndicator();
    messagesArea.appendChild(typingIndicator);
    scrollToBottom();

    try {
        const response = await fetch('/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages: conversationHistory }),
        });

        if (!response.ok) throw new Error('Error en la respuesta del servidor');

        typingIndicator.remove();
        const assistantMessage = createMessage('assistant', '');
        messagesArea.appendChild(assistantMessage);
        const contentDiv = assistantMessage.querySelector('.message-content');

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullResponse = '';

        // Track handled code blocks to avoid duplicates
        let codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
        let lastMatchIndex = 0;

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            fullResponse += chunk;

            // Render Markdown in chat
            contentDiv.innerHTML = marked.parse(fullResponse);

            // Highlight code in chat bubbles
            contentDiv.querySelectorAll('pre code').forEach((block) => {
                Prism.highlightElement(block);
            });

            // --- Live Artifact Extraction ---
            // Check for *completed* code blocks we haven't processed yet
            let match;
            // Reset regex to search from where we left off? 
            // Actually, because we are reparsing fullResponse, simple regex is tricky.
            // Let's just reset lastMatchIndex logic: find ALL matches, and if we have new ones vs previous loop...
            // Optimization: Just check if the count of blocks increased?

            // For now, let's just do it at the END of the stream to avoid partial block flickering
            // OR checks if a block closes ```

            scrollToBottom();
        }

        // Final pass to extract and show artifacts
        let match;
        while ((match = codeBlockRegex.exec(fullResponse)) !== null) {
            const language = match[1] || '';
            const code = match[2];
            addArtifact(code, language);
        }

        conversationHistory.push({ role: 'assistant', content: fullResponse });

    } catch (error) {
        console.error('Error:', error);
        typingIndicator.remove();
        const errorMessage = createMessage('assistant', 'Error en la conexión.');
        messagesArea.appendChild(errorMessage);
    } finally {
        messageInput.disabled = false;
        sendButton.disabled = false;
        messageInput.focus();
    }
});

document.addEventListener('DOMContentLoaded', () => {
    initParticles();
    messageInput.focus();
});
