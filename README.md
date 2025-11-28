# Zenco for VS Code

**AI-powered code refactoring, right in your editor.**

Zenco brings the power of LLMs (Groq, OpenAI, Anthropic, Gemini) directly to VS Code to help you refactor, document, and improve your code with a single click.

![Zenco Logo](zenco.png)

## Features

*   **🧪 Refactor File**: Intelligently refactor your code to improve structure and readability.
*   **📝 Add Docstrings**: Automatically generate comprehensive docstrings (Google, NumPy, or RST style).
*   **🏷️ Add Type Hints**: Add missing type annotations to your Python code.
*   **🧹 Remove Dead Code**: Detect and remove unused functions and variables.
*   **✨ Fix Magic Numbers**: Replace magic numbers with named constants.
*   **👀 Smart Diff View**: Preview changes with a side-by-side diff before applying them.
*   **⚙️ Multi-Provider Support**: Use your favorite LLM provider (Groq, OpenAI, Anthropic, Gemini).

## Requirements

This extension requires the **Zenco CLI** to be installed on your system.

```bash
pip install zenco
```

## Configuration

1.  Open VS Code Settings (`Cmd+,` or `Ctrl+,`).
2.  Search for **Zenco**.
3.  **Provider**: Select your preferred AI provider (default: `groq`).
4.  **API Key**: Enter your API key for the selected provider.
5.  **Model**: (Optional) Specify a custom model name.

## Usage

1.  Open a file you want to edit.
2.  Click the **Zenco** button in the status bar (bottom right).
3.  Select a feature from the menu (e.g., "Refactor File").
4.  Review the changes in the Diff View.
5.  Click **Apply Changes** or **Discard** in the status bar.

## Release Notes

### 0.0.1

Initial release of Zenco for VS Code.
