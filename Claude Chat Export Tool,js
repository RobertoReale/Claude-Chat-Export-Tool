/**
 * Claude Chat Export Tool
 * Extracts full conversation from Claude AI chat page and formats as Markdown
 * Can be executed in browser console or saved as bookmarklet
 */

(function() {
    'use strict';
    
    /**
     * Checks if an element contains all specified class names
     */
    function hasAllClasses(element, classNames) {
        return classNames.every(className => element.classList.contains(className));
    }
    
    /**
     * Detects programming language from code block context
     */
    function detectCodeLanguage(codeElement) {
        // Look for language indicators in parent elements or siblings
        let parent = codeElement.parentElement;
        while (parent) {
            const text = parent.textContent || '';
            const langMatch = text.match(/\b(javascript|python|java|cpp|c\+\+|html|css|sql|bash|shell|json|xml|yaml|markdown|php|ruby|go|rust|typescript|swift|kotlin)\b/i);
            if (langMatch) {
                return langMatch[1].toLowerCase();
            }
            parent = parent.parentElement;
        }
        
        // Look for common patterns in the code itself
        const code = codeElement.textContent || '';
        if (code.includes('function') && code.includes('{')) return 'javascript';
        if (code.includes('def ') && code.includes(':')) return 'python';
        if (code.includes('public class') || code.includes('import java.')) return 'java';
        if (code.includes('<?php')) return 'php';
        if (code.includes('<html') || code.includes('<!DOCTYPE')) return 'html';
        if (code.includes('SELECT') && code.includes('FROM')) return 'sql';
        if (code.includes('#!/bin/bash') || code.includes('echo ')) return 'bash';
        
        return ''; // No language detected
    }
    
    /**
     * Processes mathematical expressions and converts to markdown-friendly format
     */
    function processMathContent(mathElement) {
        // Handle MathML
        if (mathElement.tagName === 'MATH') {
            const mathText = mathElement.textContent || '';
            // Wrap in dollar signs for inline math or double dollar signs for block math
            const isBlock = mathElement.getAttribute('display') === 'block' || 
                           mathElement.classList.contains('math-display');
            return isBlock ? `$$${mathText}$$` : `$${mathText}$`;
        }
        
        // Handle other math rendering (KaTeX, MathJax, etc.)
        if (mathElement.classList.contains('katex') || mathElement.classList.contains('MathJax')) {
            const mathText = mathElement.textContent || '';
            return `$${mathText}$`;
        }
        
        return mathElement.textContent || '';
    }
    
    /**
     * Recursively processes DOM elements and converts to markdown
     */
    function processElement(element, depth = 0) {
        if (!element) return '';
        
        const tagName = element.tagName?.toLowerCase();
        
        // Handle text nodes
        if (element.nodeType === Node.TEXT_NODE) {
            return element.textContent || '';
        }
        
        // Skip script, style, and other non-content elements
        if (['script', 'style', 'noscript'].includes(tagName)) {
            return '';
        }
        
        // Handle code blocks
        if (tagName === 'pre' && element.querySelector('code')) {
            const codeElement = element.querySelector('code');
            const code = codeElement.textContent || '';
            const language = detectCodeLanguage(codeElement);
            return `\n\`\`\`${language}\n${code}\n\`\`\`\n`;
        }
        
        // Handle inline code
        if (tagName === 'code' && element.parentElement?.tagName !== 'PRE') {
            return `\`${element.textContent || ''}\``;
        }
        
        // Handle mathematical expressions
        if (tagName === 'math' || element.classList.contains('katex') || element.classList.contains('MathJax')) {
            return processMathContent(element);
        }
        
        // Handle line breaks
        if (tagName === 'br') {
            return '\n';
        }
        
        // Handle paragraphs
        if (tagName === 'p') {
            const content = Array.from(element.childNodes)
                .map(child => processElement(child, depth + 1))
                .join('');
            return content ? `${content}\n\n` : '';
        }
        
        // Handle lists
        if (tagName === 'ul' || tagName === 'ol') {
            const items = Array.from(element.children)
                .filter(child => child.tagName === 'LI')
                .map((li, index) => {
                    const bullet = tagName === 'ul' ? '-' : `${index + 1}.`;
                    const content = processElement(li, depth + 1).trim();
                    return `${bullet} ${content}`;
                })
                .join('\n');
            return items ? `${items}\n\n` : '';
        }
        
        // Handle headings
        if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName)) {
            const level = parseInt(tagName[1]);
            const content = Array.from(element.childNodes)
                .map(child => processElement(child, depth + 1))
                .join('');
            return `${'#'.repeat(level)} ${content.trim()}\n\n`;
        }
        
        // Handle emphasis
        if (tagName === 'strong' || tagName === 'b') {
            const content = Array.from(element.childNodes)
                .map(child => processElement(child, depth + 1))
                .join('');
            return `**${content}**`;
        }
        
        if (tagName === 'em' || tagName === 'i') {
            const content = Array.from(element.childNodes)
                .map(child => processElement(child, depth + 1))
                .join('');
            return `*${content}*`;
        }
        
        // Handle links
        if (tagName === 'a') {
            const href = element.getAttribute('href');
            const content = Array.from(element.childNodes)
                .map(child => processElement(child, depth + 1))
                .join('');
            return href ? `[${content}](${href})` : content;
        }
        
        // Handle blockquotes
        if (tagName === 'blockquote') {
            const content = Array.from(element.childNodes)
                .map(child => processElement(child, depth + 1))
                .join('');
            return content.split('\n')
                .map(line => line.trim() ? `> ${line}` : '>')
                .join('\n') + '\n\n';
        }
        
        // Default: process children
        return Array.from(element.childNodes)
            .map(child => processElement(child, depth + 1))
            .join('');
    }
    
    /**
     * Cleans up user message content to remove profile initials and other UI elements
     */
    function cleanUserMessage(content) {
        // Remove profile initials (1-3 capital letters at the start)
        content = content.replace(/^[A-Z]{1,3}\s+/, '');
        
        // Remove any standalone capital letters at the beginning
        content = content.replace(/^[A-Z]\s+/, '');
        
        // Remove common UI elements that might leak in
        content = content.replace(/^(User:|Claude:)\s*/i, '');
        
        // Clean up any remaining whitespace issues
        content = content.trim();
        
        return content;
    }
    
    /**
     * Extracts content from a message container
     */
    function extractMessageContent(messageContainer, isUserMessage) {
        let contentDiv;
        
        if (isUserMessage) {
            // For user messages, look for div with class "flex flex-row gap-2"
            contentDiv = messageContainer.querySelector('div.flex.flex-row.gap-2');
            
            // Try to find the actual message content, avoiding avatar/profile areas
            if (contentDiv) {
                // Look for the text content area, usually the last or largest text container
                const textContainers = contentDiv.querySelectorAll('div, p, span');
                let bestContainer = contentDiv;
                let maxLength = 0;
                
                // Find the container with the most text (likely the actual message)
                textContainers.forEach(container => {
                    const text = container.textContent?.trim() || '';
                    // Ignore containers that are just 1-3 capital letters (profile initials)
                    if (text.length > 3 && !text.match(/^[A-Z]{1,3}$/)) {
                        if (text.length > maxLength) {
                            maxLength = text.length;
                            bestContainer = container;
                        }
                    }
                });
                
                if (maxLength > 0) {
                    contentDiv = bestContainer;
                }
            }
        } else {
            // For Claude messages, look for div with class "font-claude-message"
            contentDiv = messageContainer.querySelector('div.font-claude-message');
        }
        
        if (!contentDiv) {
            // Fallback: try to find the main content area
            contentDiv = messageContainer.querySelector('[class*="message"]') || 
                        messageContainer.querySelector('div > div:last-child') ||
                        messageContainer;
        }
        
        // Process the content and convert to markdown
        let content = processElement(contentDiv).trim();
        
        // Clean up user messages specifically
        if (isUserMessage) {
            content = cleanUserMessage(content);
        }
        
        // Clean up excessive newlines
        return content.replace(/\n{3,}/g, '\n\n');
    }
    
    /**
     * Main function to extract the conversation
     */
    function extractConversation() {
        console.log('🔍 Starting Claude chat extraction...');
        
        const messages = [];
        
        // Find all potential message containers
        const allDivs = document.querySelectorAll('div');
        
        console.log(`📝 Found ${allDivs.length} div elements to analyze`);
        
        for (const div of allDivs) {
            // Check if it's a user message
            if (hasAllClasses(div, ['group', 'relative', 'inline-flex', 'bg-bg-300'])) {
                const content = extractMessageContent(div, true);
                if (content) {
                    messages.push({
                        type: 'user',
                        content: content,
                        element: div
                    });
                    console.log('👤 Found user message');
                }
            }
            // Check if it's a Claude message
            else if (hasAllClasses(div, ['group', 'relative', '-tracking-[0.015em]'])) {
                const content = extractMessageContent(div, false);
                if (content) {
                    messages.push({
                        type: 'claude',
                        content: content,
                        element: div
                    });
                    console.log('🤖 Found Claude message');
                }
            }
        }
        
        console.log(`✅ Extracted ${messages.length} messages total`);
        
        if (messages.length === 0) {
            console.warn('⚠️ No messages found. The page structure might have changed.');
            return null;
        }
        
        // Sort messages by DOM order
        messages.sort((a, b) => {
            const position = a.element.compareDocumentPosition(b.element);
            return position & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
        });
        
        // Generate markdown
        const markdown = messages.map(msg => {
            const prefix = msg.type === 'user' ? '**User:**' : '**Claude:**';
            return `${prefix} ${msg.content}`;
        }).join('\n\n---\n\n');
        
        return markdown;
    }
    
    /**
     * Downloads the markdown as a file
     */
    function downloadMarkdown(markdown) {
        const blob = new Blob([markdown], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `claude-chat-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    
    /**
     * Main execution function
     */
    function main() {
        console.log('🚀 Claude Chat Export Tool Starting...');
        
        const markdown = extractConversation();
        
        if (!markdown) {
            alert('❌ No conversation found. Make sure you\'re on a Claude chat page.');
            return;
        }
        
        console.log('📄 Generated markdown:', markdown.length, 'characters');
        
        // Download as file
        downloadMarkdown(markdown);
        
        console.log('🎉 Export complete!');
        alert('✅ Conversation exported successfully!');
    }
    
    // Execute the main function
    main();
    
})();
