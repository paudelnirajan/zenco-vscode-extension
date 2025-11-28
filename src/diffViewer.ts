import * as vscode from 'vscode';

export class DiffViewer implements vscode.TextDocumentContentProvider {
    // Event emitter to signal when content changes
    private _onDidChange = new vscode.EventEmitter<vscode.Uri>();

    // Map to store content for our virtual files
    private contentMap = new Map<string, string>();

    // Required by the interface - lets VS Code listen for changes
    get onDidChange(): vscode.Event<vscode.Uri> {
        return this._onDidChange.event;
    }

    /**
     * Provide content for a given URI
     * This is called by VS Code when it needs to read our virtual files
     */
    provideTextDocumentContent(uri: vscode.Uri): string {
        return this.contentMap.get(uri.toString()) || '';
    }

    /**
     * Show a diff between original and modified content
     */
    async showDiff(
        originalContent: string,
        modifiedContent: string,
        fileName: string
    ): Promise<void> {
        // Create unique URIs for the original and modified content
        // We use a custom scheme 'zenco-diff'
        const originalUri = vscode.Uri.parse(`zenco-diff:original/${fileName}`);
        const modifiedUri = vscode.Uri.parse(`zenco-diff:modified/${fileName}`);

        // Store the content
        this.contentMap.set(originalUri.toString(), originalContent);
        this.contentMap.set(modifiedUri.toString(), modifiedContent);

        // Notify VS Code that content has "changed" (in case we're reusing URIs)
        this._onDidChange.fire(originalUri);
        this._onDidChange.fire(modifiedUri);

        // Open the built-in diff editor
        await vscode.commands.executeCommand(
            'vscode.diff',
            originalUri,
            modifiedUri,
            `Zenco Preview: ${fileName} (Original ↔ Modified)`
        );
    }
}