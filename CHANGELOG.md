# Changelog

All notable changes to the "zenco-vscode" extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.0.3] - 2025-11-27

### Changed
- Updated display name from "zenco-vscode" to "Zenco" for cleaner branding.
- Added homepage link to developer's portfolio website.

## [0.0.2] - 2025-11-27

### Fixed
- Corrected repository URL in package.json to point to the correct GitHub repository.
- Ensured extension icon is properly packaged and displayed in the marketplace.

## [0.0.1] - 2025-11-27

### Added
- **Core Integration**: Initial integration with the Zenco CLI tool for AI-powered code analysis.
- **Refactoring Support**: Added command to intelligently refactor code files.
- **Docstring Generation**: Implemented automated docstring generation with support for Google, NumPy, and RST styles.
- **Type Hinting**: Added support for automatically inserting Python type hints.
- **Code Cleanup**: Added features to detect magic numbers and remove dead code (safe and strict modes).
- **Diff Viewer**: Implemented a custom diff view provider to preview changes before application.
- **Configuration**: Added VS Code settings for selecting AI providers (Groq, OpenAI, Anthropic, Gemini), managing API keys, and customizing model selection.
- **Status Bar Integration**: Added a status bar item for quick access to Zenco features and applying/discarding pending changes.