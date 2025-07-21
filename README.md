# Claude Chat Export Tool

This tool allows users to export their chat conversations from the Claude chat interface as a Markdown file. It extracts both user messages and Claude's responses, including any reasoning content, and formats them neatly for easy reading and sharing.

## Features

- Extracts user messages and Claude's responses from the chat interface.
- Cleans the extracted content to remove unnecessary elements like user initials and UI elements.
- Handles various content types, including text, code blocks, lists, and math expressions.
- Includes reasoning content in a dropdown format within the Markdown.
- Generates a downloadable Markdown file with a filename based on the chat title and the current date.

## Usage Instructions

1. **Set up the Bookmarklet**:
   - Create a new bookmark in your web browser.
   - Name it something like "Export Claude Chat".
   - In the URL field, paste the minified code from the `pt2.js` file in this repository.
   - Make sure the code is minified to fit within the bookmarklet's size limits.

2. **Run the Bookmarklet**:
   - Navigate to the Claude chat page you want to export.
   - Click the bookmarklet you created.
   - The tool will extract the conversation and prompt you to download the Markdown file.

## Example

Here's an example of what the exported Markdown might look like:

```markdown
# My Chat with Claude

*Exported on: 7/21/2024, 1:54:00 PM*
*Total messages: 5*

---

## 👤 User

Hello, Claude! Can you help me with a math problem?

---

## 🤖 Claude

<details>
<summary>🧠 Reasoning (5s)</summary>

Let me think about how to approach this math problem.

First, I need to understand the problem statement.

Then, I can apply the appropriate mathematical concepts.

</details>

Of course! I'd be happy to help with your math problem. Please go ahead and share the problem details.

---

## 👤 User

The problem is: Solve for x in the equation 2x + 3 = 7.

---

## 🤖 Claude

To solve for x in the equation 2x + 3 = 7, follow these steps:

1. Subtract 3 from both sides:
   2x + 3 - 3 = 7 - 3
   2x = 4

2. Divide both sides by 2:
   2x / 2 = 4 / 2
   x = 2

So, the solution is x = 2.

---

## 👤 User

Thank you, Claude! That was helpful.

---

```

## Requirements

- A modern web browser (e.g., Chrome, Firefox, Safari).
- Access to the Claude chat interface.

## Limitations

- The tool may not handle extremely long conversations or very large content blocks effectively due to browser limitations.
- Some specialized content types or formatting might not be fully preserved in the export.

## Contributing

If you'd like to contribute to this project, please feel free to submit a pull request or open an issue on the GitHub repository.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Contact Information

For any questions, issues, or feedback, please open an issue on the GitHub repository.
