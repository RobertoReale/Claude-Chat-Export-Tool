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
        const avatarElements = document.querySelectorAll('div[class*="rounded-full"][class*="font-bold"]');
        for (const avatar of avatarElements) {
            const text = avatar.textContent?.trim();
            if (text && text.match(/^[A-Z]{1,3}$/)) {
                return text;
            }
        }
        return null;
    }
    
    /**
     * Gets the chat title from the page
     */
    function getChatTitle() {
        const titleSelectors = [
            'button[data-testid="chat-menu-trigger"] div.truncate',
            'header div.truncate',
            'div.truncate.tracking-tight',
            'button div.truncate'
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
     * Cleans user message content - FIXED VERSION
     */
    function cleanUserMessage(content, userInitials = null) {
        if (!content) return '';
        
        // Remove user initials if present
        if (userInitials) {
            const initialsRegex = new RegExp(`^${userInitials}\\s*`, 'g');
            content = content.replace(initialsRegex, '');
        }
        
        // Remove initials pattern at the start
        content = content.replace(/^[A-Z]{1,3}\s+/, '');
        
        // FIXED: Remove Edit/Modifica patterns with various formats
        // Handle cases like "textEdit2/2", "textEdit 2 / 2", "textModifica", etc.
        content = content.replace(/(Edit|Modifica)\s*\d*\s*\/?\s*\d*/gi, '');
        
        // Remove other UI elements (Share, Copy, Delete, etc.)
        // Using lookahead/lookbehind to ensure we're not in the middle of a word
        content = content.replace(/(?<![a-zA-Z])(Share|Copy|Delete|Condividi|Copia|Elimina)(?![a-zA-Z])/gi, '');
        
        // Remove standalone number patterns like "2/2" that might remain
        content = content.replace(/(?<![a-zA-Z0-9])\d+\s*\/\s*\d+(?![a-zA-Z0-9])/g, '');
        
        // Clean up any remaining UI noise at the end of the string
        content = content.replace(/(Edit|Modifica)\s*$/gi, '');
        
        // Normalize whitespace
        content = content.replace(/\s+/g, ' ').trim();
        
        return content;
    }
    
    /**
     * Extracts user message content
     */
    function extractUserContent(messageContainer, userInitials = null) {
        let bestContent = '';
        
        // First try specific selectors
        const contentSelectors = [
            '[data-testid="user-message"]',
            'div.font-user-message',
            '.prose'
        ];
        
        for (const selector of contentSelectors) {
            const element = messageContainer.querySelector(selector);
            if (element) {
                const text = element.textContent?.trim() || '';
                if (text.length > bestContent.length) {
                    bestContent = text;
                }
            }
        }
        
        // Fallback to full container text
        if (!bestContent) {  // Removed length check
            bestContent = messageContainer.textContent?.trim() || '';
        }
        
        return cleanUserMessage(bestContent, userInitials);
    }
    
    /**
     * Extracts reasoning content
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
     * Checks if an element contains KaTeX math
     */
    function containsKatex(element) {
        return element.querySelector && element.querySelector('.katex') !== null;
    }

    /**
     * Extracts LaTeX from a KaTeX element
     */
    function extractLatexFromKatex(katexElement) {
        const annotation = katexElement.querySelector('annotation[encoding="application/x-tex"]');
        if (annotation) {
            return annotation.textContent.trim();
        }
        return null;
    }

    /**
     * Recursively extracts text and math from elements - FIXED VERSION
     */
    function extractContentRecursive(element, reasoningDropdown = null, result = { parts: [] }, listDepth = 0) {
        // Skip if in reasoning dropdown
        if (reasoningDropdown && reasoningDropdown.contains(element)) {
            return result;
        }
        
        // Handle KaTeX elements directly
        if (element.classList && element.classList.contains('katex')) {
            const latex = extractLatexFromKatex(element);
            if (latex) {
                const isDisplay = element.classList.contains('katex-display') || 
                                element.parentElement?.classList.contains('katex-display');
                
                result.parts.push({
                    type: 'math',
                    content: latex,
                    display: isDisplay
                });
            }
            return result;
        }
        
        // Skip katex-html and katex-mathml spans to avoid duplication
        if (element.classList && 
            (element.classList.contains('katex-html') || 
            element.classList.contains('katex-mathml'))) {
            return result;
        }
        
        // Handle specific tags first
        const tag = element.tagName?.toLowerCase();
        
        // Handle formatting tags that might contain math
        if (tag === 'strong' || tag === 'b') {
            // Check if this contains KaTeX
            if (containsKatex(element)) {
                // Process children to extract math properly
                for (const child of element.children) {
                    if (child.classList && child.classList.contains('katex')) {
                        const latex = extractLatexFromKatex(child);
                        if (latex) {
                            result.parts.push({
                                type: 'bold_math',
                                content: latex
                            });
                        }
                    } else {
                        // Process non-katex children normally
                        extractContentRecursive(child, reasoningDropdown, result, listDepth);
                    }
                }
                
                // Also check for text nodes that aren't part of katex
                for (const node of element.childNodes) {
                    if (node.nodeType === Node.TEXT_NODE) {
                        const text = node.textContent.trim();
                        if (text) {
                            result.parts.push({
                                type: 'bold',
                                content: text
                            });
                        }
                    }
                }
                return result;
            } else {
                // No math, just bold text - DON'T RETURN, continue processing
                result.parts.push({
                    type: 'bold',
                    content: element.textContent.trim()
                });
                // REMOVED: return result;
            }
        }
        
        else if (tag === 'em' || tag === 'i') {
            result.parts.push({
                type: 'italic',
                content: element.textContent.trim()
            });
            // REMOVED: return result;
        }
        
        // Handle other specific tags
        else if (tag === 'br') {
            result.parts.push({ type: 'break' });
            return result;
        }
        
        else if (tag === 'p' || tag === 'div') {
            // Add paragraph break before if needed
            const lastPart = result.parts[result.parts.length - 1];
            if (lastPart && lastPart.type !== 'paragraph') {
                result.parts.push({ type: 'paragraph' });
            }
            
            // Process children
            for (const child of element.childNodes) {
                if (child.nodeType === Node.TEXT_NODE) {
                    const text = child.textContent.trim();
                    if (text) {
                        const lastPart = result.parts[result.parts.length - 1];
                        if (lastPart && lastPart.type === 'text') {
                            lastPart.content += ' ' + text;
                        } else {
                            result.parts.push({
                                type: 'text',
                                content: text
                            });
                        }
                    }
                } else if (child.nodeType === Node.ELEMENT_NODE) {
                    extractContentRecursive(child, reasoningDropdown, result, listDepth);
                }
            }
            
            // Add paragraph break after
            result.parts.push({ type: 'paragraph' });
            return result;
        }
        
        else if (tag === 'ul' || tag === 'ol') {
            const isOrdered = tag === 'ol';
            const items = Array.from(element.children).filter(el => el.tagName.toLowerCase() === 'li');
            
            items.forEach((item, index) => {
                result.parts.push({
                    type: 'listitem',
                    ordered: isOrdered,
                    depth: listDepth,
                    index: index + 1
                });
                
                // Process the content of the list item
                for (const child of item.childNodes) {
                    if (child.nodeType === Node.TEXT_NODE) {
                        const text = child.textContent.trim();
                        if (text) {
                            result.parts.push({
                                type: 'text',
                                content: text
                            });
                        }
                    } else if (child.nodeType === Node.ELEMENT_NODE) {
                        extractContentRecursive(child, reasoningDropdown, result, listDepth + 1);
                    }
                }
                
                result.parts.push({ type: 'break' });
            });
            return result;
        }
        
        else if (tag === 'code' && (!element.parentElement || element.parentElement.tagName !== 'PRE')) {
            result.parts.push({
                type: 'code',
                content: element.textContent
            });
            return result;
        }
        
        else if (tag === 'pre') {
            const codeEl = element.querySelector('code');
            result.parts.push({
                type: 'codeblock',
                content: codeEl ? codeEl.textContent : element.textContent,
                language: codeEl?.className?.match(/language-(\w+)/)?.[1] || ''
            });
            return result;
        }
        
        else if (tag && tag.match(/^h[1-6]$/)) {
            result.parts.push({
                type: 'heading',
                level: parseInt(tag[1]),
                content: element.textContent
            });
            return result;
        }
        
        // Default: process child nodes (only if not already handled)
        else {
            for (const child of element.childNodes) {
                if (child.nodeType === Node.TEXT_NODE) {
                    const text = child.textContent.trim();
                    if (text) {
                        const lastPart = result.parts[result.parts.length - 1];
                        if (lastPart && lastPart.type === 'text') {
                            lastPart.content += ' ' + text;
                        } else {
                            result.parts.push({
                                type: 'text',
                                content: text
                            });
                        }
                    }
                } else if (child.nodeType === Node.ELEMENT_NODE) {
                    extractContentRecursive(child, reasoningDropdown, result, listDepth);
                }
            }
        }
        
        return result;
    }

    /**
     * Converts content parts to markdown - IMPROVED VERSION
     */
    function partsToMarkdown(parts) {
        let markdown = '';
        
        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            const prevPart = i > 0 ? parts[i - 1] : null;
            const nextPart = i < parts.length - 1 ? parts[i + 1] : null;
            
            // Check if we need a space before this part
            const needSpaceBefore = prevPart && 
                                   (prevPart.type === 'text' || prevPart.type === 'bold' || prevPart.type === 'italic' || prevPart.type === 'code') &&
                                   (part.type === 'bold' || part.type === 'italic' || part.type === 'code') &&
                                   !markdown.endsWith(' ') && 
                                   !markdown.endsWith('\n');
            
            if (needSpaceBefore) {
                markdown += ' ';
            }
            
            switch (part.type) {
                case 'text':
                    markdown += part.content;
                    break;
                case 'math':
                    if (part.display) {
                        markdown += `\n\n$$${part.content}$$\n\n`;
                    } else {
                        markdown += `$${part.content}$`;
                    }
                    break;
                case 'bold_math':
                    // Special handling for bold math
                    markdown += `**$${part.content}$**`;
                    break;
                case 'listitem':
                    // ensure we start on a new line
                    if (!markdown.endsWith('\n')) {
                        markdown += '\n';
                    }
                    
                    // Add proper indentation
                    const indent = '  '.repeat(part.depth);
                    if (part.ordered) {
                        markdown += `${indent}${part.index}. `;
                    } else {
                        markdown += `${indent}- `;
                    }
                    break;
                case 'paragraph':
                    // Add double newline, but avoid multiple consecutive breaks
                    if (!markdown.endsWith('\n\n')) {
                        markdown += '\n\n';
                    }
                    break;
                case 'break':
                    if (!markdown.endsWith('\n')) {
                        markdown += '\n';
                    }
                    break;
                case 'code':
                    markdown += `\`${part.content}\``;
                    break;
                case 'codeblock':
                    markdown += `\n\`\`\`${part.language}\n${part.content}\n\`\`\`\n`;
                    break;
                case 'bold':
                    markdown += `**${part.content}**`;
                    break;
                case 'italic':
                    markdown += `*${part.content}*`;
                    break;
                case 'heading':
                    markdown += `\n${'#'.repeat(part.level)} ${part.content}\n\n`;
                    break;
            }
            
            // Check if we need a space after this part
            const needSpaceAfter = nextPart && 
                                  (part.type === 'bold' || part.type === 'italic' || part.type === 'code') &&
                                  (nextPart.type === 'text') &&
                                  !nextPart.content.startsWith(' ') &&
                                  !nextPart.content.startsWith(',') &&
                                  !nextPart.content.startsWith('.');
            
            if (needSpaceAfter) {
                markdown += ' ';
            }
        }
        
        // Clean up excessive newlines
        markdown = markdown.replace(/\n{3,}/g, '\n\n').trim();
        
        return markdown;
    }
    
    /**
     * Extracts Claude response content
     */
    function extractClaudeResponse(messageContainer, reasoningDropdown) {
        console.log('Extracting Claude response...');
        
        // Find the main content area
        const responseArea = messageContainer.querySelector('div.font-claude-message') ||
                            messageContainer.querySelector('[class*="prose"]') ||
                            messageContainer;
        
        if (!responseArea) {
            console.warn('No response area found');
            return '';
        }
        
        // Extract content recursively
        const { parts } = extractContentRecursive(responseArea, reasoningDropdown);
        
        console.log(`Extracted ${parts.length} content parts`);
        
        // Convert to markdown
        const markdown = partsToMarkdown(parts);
        
        console.log('Generated markdown:', markdown.substring(0, 200) + '...');
        
        return markdown;
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
                (hasAllClasses(div, ['group', 'relative', 'inline-flex']) && div.classList.contains('bg-bg-300'))) {
                const content = extractUserContent(div, userInitials);
                if (content && content.length > 0) {  // Changed from > 5 to > 0
                    messageData = {
                        type: 'user',
                        content: content,
                        element: div,
                        contentHash: hashString(content)
                    };
                    console.log('👤 Found user message:', content.substring(0, 50) + '...');
                }
            }
            // Check for Claude message
            else if (hasAllClasses(div, ['group', 'relative', '-tracking-[0.015em]']) ||
                     (hasAllClasses(div, ['group', 'relative']) && div.classList.contains('-tracking-[0.015em]'))) {
                
                // Look for reasoning dropdown
                const reasoningDropdown = div.querySelector('[class*="rounded-lg"][class*="border"]');
                const hasReasoningContent = reasoningDropdown && reasoningDropdown.querySelector('[class*="overflow"]');
                
                let reasoning = null;
                if (hasReasoningContent) {
                    reasoning = extractReasoningContent(reasoningDropdown);
                    console.log('🧠 Found reasoning:', reasoning?.content.substring(0, 50) + '...');
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
        
        // Sort messages by DOM order
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
            
            // Add separator between messages
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
        
        // Also log a preview to console for debugging
        console.log('📄 Markdown preview:\n', markdown.substring(0, 500) + '...');
        
        downloadMarkdown(markdown, chatTitle);
        
        console.log('🎉 Export complete!');
        alert(`✅ Successfully exported ${messages.length} messages!\nCheck your downloads folder.`);
        
    } catch (error) {
        console.error('❌ Export error:', error);
        alert('❌ Export failed. Check the console for details.');
    }
})();
