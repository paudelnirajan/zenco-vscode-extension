# Zenco for VS Code

[![Visual Studio Marketplace Version](https://img.shields.io/visual-studio-marketplace/v/paudelnirajan.zenco-vscode)](https://marketplace.visualstudio.com/items?itemName=paudelnirajan.zenco-vscode)
[![Visual Studio Marketplace Installs](https://img.shields.io/visual-studio-marketplace/i/paudelnirajan.zenco-vscode)](https://marketplace.visualstudio.com/items?itemName=paudelnirajan.zenco-vscode)
[![Visual Studio Marketplace Rating](https://img.shields.io/visual-studio-marketplace/r/paudelnirajan.zenco-vscode)](https://marketplace.visualstudio.com/items?itemName=paudelnirajan.zenco-vscode)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Zenco is an AI-powered code analysis and enhancement tool integrated directly into Visual Studio Code. It leverages Large Language Models (LLMs) to automatically generate docstrings, add type hints, detect magic numbers, remove dead code, and provide intelligent refactoring suggestions across multiple programming languages including Python, JavaScript, Java, Go, and C++.

This extension is the official VS Code integration for the [Zenco CLI tool](https://github.com/paudelnirajan/zenco).

## Features

Zenco streamlines your development workflow by automating code quality tasks:

*   **Refactor File**: Intelligently refactors code to improve structure and readability using AI.
*   **Add Docstrings**: Automatically generates comprehensive, context-aware docstrings for functions and classes. Supports Google, NumPy, and RST styles.
*   **Add Type Hints**: Analyzes Python code to add missing type annotations, improving code safety and IDE autocompletion.
*   **Fix Magic Numbers**: Identifies numeric literals in code and replaces them with named constants to improve maintainability.
*   **Remove Dead Code**: Detects and removes unused imports, variables, and functions.
*   **Strict Mode**: Offers advanced cleanup options, including the removal of unused local variables and private methods.
*   **Diff View**: Provides a side-by-side comparison of proposed changes before they are applied, ensuring you maintain full control over your code.
*   **Multi-Provider Support**: Compatible with major LLM providers including Groq, OpenAI, Anthropic, and Google Gemini.

## Requirements

This extension requires the Zenco CLI tool to perform code analysis.

### Automatic Installation (Recommended)

When you first use the extension, you'll be prompted to install the Zenco CLI automatically. Simply click "Install" and the extension will handle the setup for you!

### Manual Installation

If you prefer to install manually, or if automatic installation fails, run:

```bash
pip install zenco
```

### Checking Installation

You can verify your CLI installation at any time:
1. Open the Command Palette (Cmd+Shift+P / Ctrl+Shift+P)
2. Run "Zenco: Check CLI Installation"

The extension will show your installed version and offer to upgrade if needed.


## Extension Settings

This extension contributes the following settings to Visual Studio Code:

*   `zenco.provider`: Specifies the AI provider to use for code analysis. Options include `groq`, `openai`, `anthropic`, and `gemini`. Default is `groq`.
*   `zenco.apiKey`: The API key for your selected provider. This is stored securely.
*   `zenco.model`: (Optional) Specifies a particular model to use with your selected provider (e.g., `llama-3.3-70b-versatile`, `gpt-4o`).
*   `zenco.docstringStyle`: Defines the style for generated docstrings. Options are `google`, `numpy`, or `rst`.
*   `zenco.strategy`: Determines the processing strategy. Default is `llm`.

To configure these settings:
1.  Open Visual Studio Code Settings (Command+Comma on macOS, Ctrl+Comma on Windows/Linux).
2.  Search for "Zenco".
3.  Enter your preferences and API credentials.

## Usage

1.  Open the file you wish to enhance in the editor.
2.  Click the **Zenco** status bar item (located in the bottom right corner).
3.  Select a desired action from the menu, such as "Refactor File" or "Add Docstrings".
4.  The extension will generate a preview of the changes in a diff view.
5.  Review the proposed changes.
6.  Click **Apply Changes** in the status bar to confirm, or **Discard** to cancel.

## Known Issues

*   Ensure the `zenco` command is available in your system PATH. If VS Code cannot find the command, try launching VS Code from the terminal or adding the Python scripts directory to your PATH.

## Release Notes

See [CHANGELOG.md](CHANGELOG.md) for full release history.
## Collaborators

<a href="https://github.com/NirajanPaudel">
  <img src="https://github.com/paudelnirajan.png" width="60" height="60" />
</a>

<a href="https://github.com/AruruGunabhiram">
  <img src="https://github.com/AruruGunabhiram.png" width="60" height="60" />
</a>

### 0.1.0

- Automatic Zenco CLI installation and management
- Smart path resolution for CLI detection across all platforms
- CLI management commands for checking and reinstalling
- Improved error handling and cross-platform compatibility

### 0.0.3

- Changed display name to "Zenco" for cleaner branding in the marketplace.
- Added homepage link to developer's portfolio website.

### 0.0.2

- Fixed repository URL in package.json.
- Ensured extension icon is properly packaged and displayed in the marketplace.

### 0.0.1

- Initial release of the Zenco VS Code extension.
- Support for Refactoring, Docstrings, Type Hints, Magic Numbers, and Dead Code removal.
- Integration with Groq, OpenAI, Anthropic, and Gemini.
