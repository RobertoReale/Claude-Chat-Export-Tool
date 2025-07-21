javascript:(function() {
    'use strict';
    
    console.log('🚀 Starting Complete Claude Chat Export...');
    
    /**
     * Utility function to check if element has all specified classes
     */
    function hasAllClasses(element, classNames) {
        return classNames.every(className => element.classList.contains(className));
    }
    
    /**
     * Creates a simple hash for deduplication
     */
    function hashString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash.toString();
    }
    
    /**
     * Extracts user initials from the page
     */
    function getUserInitials() {
        // Look for user initials in profile avatar
        const avatarElements = document.querySelectorAll('div[class*="rounded-full"][class*="font-bold"]');
        for (const avatar of avatarElements) {
            const text = avatar.textContent?.trim();
            if (text && text.match(/^[A-Z]{1,3}$/)) {
                return text;
            }
        }
        
        // Fallback: try to find initials in any element with 1-3 capital letters
        const allElements = document.querySelectorAll('*');
        for (const el of allElements) {
            const text = el.textContent?.trim();
            if (text && text.match(/^[A-Z]{1,3}$/) && el.children.length === 0) {
                return text;
            }
        }
        
        return null;
    }
    
    /**
     * Gets the chat title from the page
     */
    function getChatTitle() {
        // Look for the chat title in the header
        const titleSelectors = [
            'button[data-testid="chat-menu-trigger"] div.truncate',
            'header div.truncate',
            'div.truncate.tracking-tight',
            'button div.truncate',
            '[class*="truncate"]'
        ];
        
        for (const selector of titleSelectors) {
            const element = document.querySelector(selector);
            if (element) {
                const title = element.textContent?.trim();
                if (title && title.length > 0 && !title.match(/^[A-Z]{1,3}$/)) {
                    return title;
                }
            }
        }
        
        return 'Claude Chat Export';
    }
    
    /**
     * Cleans user message content by removing profile initials and UI elements
     */
    function cleanUserMessage(content, userInitials = null) {
        if (!content) return '';
        
        // Remove user initials if found
        if (userInitials) {
            const initialsRegex = new RegExp(`^${userInitials}\\s*`, 'g');
            content = content.replace(initialsRegex, '');
        }
        
        // Remove any 1-3 capital letters at the start (fallback)
        content = content.replace(/^[A-Z]{1,3}\s+/, '');
        
        // Remove common UI elements
        content = content.replace(/^(User:|Claude:)\s*/i, '');
        content = content.replace(/\b(Share|Copy|Edit|Delete|Modifica|Condividi|Copia|Modifica|Elimina)\b/g, '');
        
        // Remove navigation elements like "2/2"
        content = content.replace(/\d+\/\d+/g, '');
        
        // Clean up whitespace
        content = content.replace(/\s+/g, ' ').trim();
        
        return content;
    }
    
    /**
     * Extracts user message content
     */
    function extractUserContent(messageContainer, userInitials = null) {
        // Try to find the main content area
        const contentSelectors = [
            '[data-testid="user-message"]',
            'div.font-user-message',
            'div.flex.flex-row.gap-2',
            '[class*="message"]',
            'div > div:last-child',
            'p'
        ];
        
        let bestContent = '';
        let maxLength = 0;
        
        for (const selector of contentSelectors) {
            const elements = messageContainer.querySelectorAll(selector);
            elements.forEach(element => {
                // Skip avatar elements
                if (element.classList.contains('rounded-full') || 
                    element.classList.contains('shrink-0') ||
                    (element.textContent?.trim().match(/^[A-Z]{1,3}$/) && element.children.length === 0)) {
                    return;
                }
                
                const text = element.textContent?.trim() || '';
                if (text.length > 3 && text.length > maxLength) {
                    maxLength = text.length;
                    bestContent = text;
                }
            });
        }
        
        // Fallback to container text if no better content found
        if (!bestContent || bestContent.length < 10) {
            bestContent = messageContainer.textContent?.trim() || '';
        }
        
        return cleanUserMessage(bestContent, userInitials);
    }
    
    /**
     * Extracts reasoning content from dropdown
     */
    function extractReasoningContent(reasoningDropdown) {
        if (!reasoningDropdown) return null;
        
        let time = '';
        let content = '';
        
        // Extract time indicator (look for various formats)
        const timeSelectors = [
            '[class*="tabular-nums"]',
            '[class*="time"]',
            'span:contains("s")',
            'div:contains("s")'
        ];
        
        for (const selector of timeSelectors) {
            const timeEl = reasoningDropdown.querySelector(selector);
            if (timeEl && timeEl.textContent.match(/\d+s?/)) {
                time = timeEl.textContent.trim();
                break;
            }
        }
        
        // Extract reasoning content
        const contentArea = reasoningDropdown.querySelector('[class*="overflow-y-auto"]') ||
                           reasoningDropdown.querySelector('[class*="overflow"]') ||
                           reasoningDropdown;
        
        if (contentArea) {
            // Process paragraphs
            contentArea.querySelectorAll('p').forEach(p => {
                const text = p.textContent.trim();
                if (text && !text.match(/^\d+s?$/)) { // Skip time indicators
                    content += text + '\n\n';
                }
            });
            
            // Process lists
            contentArea.querySelectorAll('ol, ul').forEach(list => {
                const items = list.querySelectorAll('li');
                items.forEach((item, i) => {
                    const text = item.textContent.trim();
                    if (text) {
                        if (list.tagName === 'OL') {
                            content += `${i + 1}. ${text}\n`;
                        } else {
                            content += `- ${text}\n`;
                        }
                    }
                });
                if (items.length > 0) content += '\n';
            });
        }
        
        return content.trim() ? { content: content.trim(), time } : null;
    }
    
    /**
     * Extracts Claude response content (excluding reasoning)
     */
    function extractClaudeResponse(messageContainer, reasoningDropdown) {
        let response = '';
        const processed = new Set();
        
        // Look for the main response area with Claude styling
        const responseArea = messageContainer.querySelector('div.font-claude-message') ||
                            messageContainer.querySelector('[class*="prose"]') ||
                            messageContainer;
        
        // Process all content elements
        const contentElements = responseArea.querySelectorAll('p, h1, h2, h3, h4, h5, h6, pre, code, ul, ol, blockquote, table');
        
        contentElements.forEach(el => {
            // Skip if inside reasoning dropdown
            if (reasoningDropdown && reasoningDropdown.contains(el)) return;
            
            const text = el.textContent.trim();
            if (!text || processed.has(text)) return;
            processed.add(text);
            
            // Process different element types
            switch(el.tagName) {
                case 'P':
                    if (text) response += text + '\n\n';
                    break;
                    
                case 'H1': case 'H2': case 'H3': case 'H4': case 'H5': case 'H6':
                    const level = parseInt(el.tagName[1]);
                    response += '#'.repeat(level) + ' ' + text + '\n\n';
                    break;
                    
                case 'PRE':
                    // Handle code blocks
                    const codeEl = el.querySelector('code');
                    const code = codeEl ? codeEl.textContent : text;
                    response += '```\n' + code + '\n```\n\n';
                    break;
                    
                case 'CODE':
                    if (el.parentElement.tagName !== 'PRE') {
                        response += '`' + text + '`';
                    }
                    break;
                    
                case 'LI':
                    const list = el.parentElement;
                    if (list.tagName === 'OL') {
                        const index = Array.from(list.children).indexOf(el) + 1;
                        response += `${index}. ${text}\n`;
                    } else {
                        response += `- ${text}\n`;
                    }
                    if (el.nextElementSibling === null) response += '\n';
                    break;
                    
                case 'BLOCKQUOTE':
                    response += '> ' + text.replace(/\n/g, '\n> ') + '\n\n';
                    break;
            }
        });
        
        // Handle math expressions
        responseArea.querySelectorAll('.katex, [class*="math"]').forEach(math => {
            if (reasoningDropdown && reasoningDropdown.contains(math)) return;
            const latex = math.getAttribute('data-latex') || math.textContent;
            if (latex && !response.includes(latex)) {
                response += `$${latex}$\n\n`;
            }
        });
        
        return response.trim();
    }
    
    /**
     * Main extraction function
     */
    function extractFullConversation() {
        const messages = [];
        const seenContent = new Set();
        const allDivs = document.querySelectorAll('div');
        const userInitials = getUserInitials();
        
        console.log(`📝 Analyzing ${allDivs.length} elements...`);
        if (userInitials) {
            console.log(`👤 Found user initials: ${userInitials}`);
        }
        
        for (const div of allDivs) {
            let messageData = null;
            
            // Check for user message
            if (hasAllClasses(div, ['group', 'relative', 'inline-flex', 'bg-bg-300']) ||
                hasAllClasses(div, ['group', 'relative', 'inline-flex']) && div.classList.contains('bg-bg-300')) {
                const content = extractUserContent(div, userInitials);
                if (content && content.length > 5) { // Reduced threshold after cleaning
                    messageData = {
                        type: 'user',
                        content: content,
                        element: div,
                        contentHash: hashString(content)
                    };
                    console.log('👤 Found user message');
                }
            }
            // Check for Claude message
            else if (hasAllClasses(div, ['group', 'relative', '-tracking-[0.015em]']) ||
                     hasAllClasses(div, ['group', 'relative']) && div.classList.contains('-tracking-[0.015em]')) {
                // Look for reasoning dropdown
                const reasoningDropdown = div.querySelector('[class*="rounded-lg"][class*="border"]');
                const hasReasoningContent = reasoningDropdown && reasoningDropdown.querySelector('[class*="overflow-y-auto"]');
                
                let reasoning = null;
                if (hasReasoningContent) {
                    reasoning = extractReasoningContent(reasoningDropdown);
                }
                
                const response = extractClaudeResponse(div, reasoningDropdown);
                
                if (reasoning || response) {
                    const combinedContent = (reasoning?.content || '') + (response || '');
                    messageData = {
                        type: 'claude',
                        reasoning: reasoning,
                        response: response,
                        element: div,
                        contentHash: hashString(combinedContent)
                    };
                    console.log('🤖 Found Claude message' + (reasoning ? ' (with reasoning)' : ''));
                }
            }
            
            // Add message if valid and not duplicate
            if (messageData && !seenContent.has(messageData.contentHash)) {
                seenContent.add(messageData.contentHash);
                messages.push(messageData);
            }
        }
        
        console.log(`✅ Extracted ${messages.length} messages total`);
        
        if (messages.length === 0) {
            console.warn('⚠️ No messages found');
            return null;
        }
        
        // Sort messages by DOM order to maintain conversation flow
        messages.sort((a, b) => {
            const position = a.element.compareDocumentPosition(b.element);
            return position & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
        });
        
        return messages;
    }
    
    /**
     * Converts messages to markdown format
     */
    function generateMarkdown(messages, chatTitle) {
        let markdown = `# ${chatTitle}\n\n`;
        markdown += `*Exported on: ${new Date().toLocaleString()}*\n\n`;
        markdown += `*Total messages: ${messages.length}*\n\n`;
        markdown += '---\n\n';
        
        messages.forEach((msg, index) => {
            if (msg.type === 'user') {
                markdown += `## 👤 User\n\n${msg.content}\n\n`;
            } else if (msg.type === 'claude') {
                markdown += `## 🤖 Claude\n\n`;
                
                // Add reasoning as dropdown if present
                if (msg.reasoning && msg.reasoning.content) {
                    markdown += `<details>\n<summary>🧠 Reasoning`;
                    if (msg.reasoning.time) {
                        markdown += ` (${msg.reasoning.time})`;
                    }
                    markdown += `</summary>\n\n${msg.reasoning.content}\n\n</details>\n\n`;
                }
                
                // Add response
                if (msg.response) {
                    markdown += `${msg.response}\n\n`;
                }
            }
            
            // Add separator between messages (except for the last one)
            if (index < messages.length - 1) {
                markdown += '---\n\n';
            }
        });
        
        return markdown;
    }
    
    /**
     * Downloads markdown as file
     */
    function downloadMarkdown(content, chatTitle) {
        const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        
        // Create filename from chat title
        const safeTitle = chatTitle
            .replace(/[^a-zA-Z0-9\s\-_]/g, '')
            .replace(/\s+/g, '-')
            .toLowerCase()
            .substring(0, 50);
        
        a.download = `${safeTitle}-${new Date().toISOString().slice(0,19).replace(/:/g, '-')}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    
    /**
     * Main execution
     */
    try {
        const chatTitle = getChatTitle();
        console.log(`📄 Chat title: ${chatTitle}`);
        
        const messages = extractFullConversation();
        
        if (!messages || messages.length === 0) {
            alert('❌ No conversation found. Make sure you\'re on a Claude chat page with messages.');
            return;
        }
        
        const markdown = generateMarkdown(messages, chatTitle);
        console.log('📄 Generated markdown:', markdown.length, 'characters');
        
        downloadMarkdown(markdown, chatTitle);
        
        console.log('🎉 Export complete!');
        alert(`✅ Successfully exported ${messages.length} messages!\nCheck your downloads folder.`);
        
    } catch (error) {
        console.error('❌ Export error:', error);
        alert('❌ Export failed. Check the console for details.');
    }
})();
