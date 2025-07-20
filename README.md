# Claude Chat Export Tool

A powerful browser-based tool to export complete Claude AI chat conversations into well-formatted Markdown files. Extract all your conversations with a single click, preserving code blocks, mathematical expressions, formatting, and conversation structure.

##  Features

-  **Smart Content Detection** - Automatically identifies user vs Claude messages using precise DOM analysis
-  **Complete Content Extraction** - Preserves text, code blocks, mathematical expressions, lists, and formatting
-  **Clean Output** - Removes UI elements like profile initials and navigation components
-  **Instant Download** - Generates timestamped `.md` files ready for use
-  **Zero Dependencies** - Pure JavaScript, runs in any modern browser
-  **Cross-Browser Compatible** - Works on Chrome, Firefox, Safari, and Edge
-  **Multiple Usage Options** - Browser console script or convenient bookmarklet

##  Quick Start

### Method 1: Browser Console (Recommended)

1. Navigate to your Claude chat conversation
2. Open Developer Tools (`F12` or `Ctrl+Shift+I`)
3. Go to the **Console** tab
4. Copy and paste the script from [`claude-chat-exporter.js`](claude-chat-exporter.js)
5. Press `Enter` to execute
6. Your conversation will be automatically downloaded as a `.md` file

### Method 2: Bookmarklet

1. Copy the bookmarklet code from [`bookmarklet.js`](bookmarklet.js)
2. Create a new bookmark in your browser
3. Set the name to "Export Claude Chat"
4. Paste the bookmarklet code as the URL
5. Click the bookmark while on any Claude chat page

##  Output Format

The tool generates clean, readable Markdown with the following structure:

```markdown
**User:** Your question or message here

---

**Claude:** Claude's response with proper formatting

```python
# Code blocks are preserved with syntax highlighting
def example_function():
    return "Hello, World!"
```

Mathematical expressions are converted to LaTeX format: $E = mc^2$

---

**User:** Follow-up question

---

**Claude:** Another response...
```

## 🛠 Technical Details

### Supported Content Types

- ✅ Plain text and formatted text
- ✅ Code blocks with automatic language detection
- ✅ Mathematical expressions (MathML, KaTeX, MathJax)
- ✅ Lists (ordered and unordered)
- ✅ Headers and emphasis (bold, italic)
- ✅ Links and blockquotes
- ✅ Line breaks and proper spacing

### Page Structure Analysis

The tool uses precise CSS class detection to identify message containers:

**User Messages:**
- Container: `div` with classes `group`, `relative`, `inline-flex`, `bg-bg-300`
- Content: Located within `div.flex.flex-row.gap-2`

**Claude Messages:**
- Container: `div` with classes `group`, `relative`, `-tracking-[0.015em]`
- Content: Located within `div.font-claude-message`

### Content Cleaning

- Removes profile initials (e.g., "RR", "JD") from user messages
- Filters out UI controls and navigation elements
- Preserves conversation flow and message order
- Cleans up excessive whitespace and formatting

## 🔧 Customization

### Modify Output Format

To customize the output format, edit the markdown generation section:

```javascript
const markdown = messages.map(msg => {
    const prefix = msg.type === 'user' ? '**User:**' : '**Claude:**';
    return `${prefix} ${msg.content}`;
}).join('\n\n---\n\n');
```

### Add Language Detection

The tool includes automatic programming language detection for code blocks. To add more languages:

```javascript
function detectCodeLanguage(codeElement) {
    // Add your language patterns here
    const langMatch = text.match(/\b(yournewlanguage|anotherlang)\b/i);
    // ...
}
```

##  Troubleshooting

### Common Issues

**"No conversation found" error:**
- Ensure you're on a Claude chat page with messages
- Check that the page has fully loaded
- Try refreshing the page and running the script again

**Missing or incomplete content:**
- The Claude interface may have been updated
- Check the browser console for error messages
- Try the script on a different conversation

**Script not executing:**
- Ensure JavaScript is enabled in your browser
- Check for any browser extensions that might block scripts
- Try using the bookmarklet method instead

##  Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

### Development Setup

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes and test thoroughly
4. Submit a pull request with a clear description

### Code Style

- Use ES6+ JavaScript features
- Follow JSDoc commenting conventions
- Maintain browser compatibility
- Test on multiple browsers before submitting

##  License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

##  Support

If you encounter any issues or have questions:

1. Check the [Troubleshooting](#-troubleshooting) section
2. Search existing [GitHub Issues](https://github.com/yourusername/claude-chat-export/issues)
3. Create a new issue with detailed information about your problem

---
