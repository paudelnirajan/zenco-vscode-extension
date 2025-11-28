import * as vscode from 'vscode';
import * as path from 'path';
import {
    refactorFile,
    addDocstrings,
    addTypeHints,
    fixMagicNumbers,
    removeDeadCode,
    runZencoCommand
} from './zencoRunner';
import { DiffViewer } from './diffViewer';

export function activate(context: vscode.ExtensionContext) {
    console.log('Congratulations, your extension "zenco" is now active!');

    // State for pending changes
    let pendingResult: any = null;
    let pendingEditor: vscode.TextEditor | null = null;

    // 1. Initialize Output Channel
    const outputChannel = vscode.window.createOutputChannel('Zenco');

    // 2. Initialize Diff Viewer
    const diffViewer = new DiffViewer();
    context.subscriptions.push(
        vscode.workspace.registerTextDocumentContentProvider('zenco-diff', diffViewer)
    );

    // 3. Create Status Bar Item
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.show();
    context.subscriptions.push(statusBarItem);

    // Helper to reset status bar
    function resetStatusBar() {
        statusBarItem.text = "$(zap) Zenco";
        statusBarItem.tooltip = "Click to refactor current file with Zenco";
        statusBarItem.backgroundColor = undefined;
        statusBarItem.command = 'zenco-vscode.showMenu';
    }

    // Helper to show apply button
    function showApplyStatusBar() {
        statusBarItem.text = "$(check) Apply! or $(x) Discard!";
        statusBarItem.tooltip = "Choose to apply or discard the changes you are previewing";
        statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
        statusBarItem.command = 'zenco-vscode.applyPending';
    }

    // Initialize status bar
    resetStatusBar();

    /**
     * Helper function to run a Zenco feature with consistent UX
     */
    async function runZencoFeature(
        featureName: string,
        featureFunction: (doc: vscode.TextDocument) => Promise<any>,
        outputChannel: vscode.OutputChannel,
        diffViewer: DiffViewer
    ) {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No file is currently open!');
            return;
        }

        // Reset any previous pending state
        if (pendingResult) {
            pendingResult = null;
            pendingEditor = null;
            resetStatusBar();
        }

        // Ask user: Preview or Apply?
        const choice = await vscode.window.showQuickPick(
            ['Preview Changes (Diff)', 'Apply Changes'],
            {
                placeHolder: `${featureName}: Preview or Apply?`
            }
        );

        if (!choice) {
            return; // User cancelled
        }

        const applyChanges = choice === 'Apply Changes';

        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `Zenco: ${featureName}...`,
            cancellable: false
        }, async (progress) => {
            const result = await featureFunction(editor.document);

            if (result.success) {
                // Show output in panel
                if (result.output) {
                    outputChannel.clear();
                    outputChannel.appendLine(`=== Zenco: ${featureName} Results ===`);
                    outputChannel.appendLine(result.output);
                }

                if (applyChanges) {
                    if (result.modifiedContent) {
                        const edit = new vscode.WorkspaceEdit();
                        const fullRange = new vscode.Range(
                            editor.document.positionAt(0),
                            editor.document.positionAt(editor.document.getText().length)
                        );

                        edit.replace(editor.document.uri, fullRange, result.modifiedContent);
                        await vscode.workspace.applyEdit(edit);

                        vscode.window.showInformationMessage(
                            `✅ ${featureName} applied successfully!`
                        );
                    } else {
                        vscode.window.showWarningMessage('No changes returned from Zenco.');
                    }
                } else {
                    // Preview Mode with Diff View
                    if (result.originalContent && result.modifiedContent) {
                        const fileName = path.basename(editor.document.fileName);

                        await diffViewer.showDiff(
                            result.originalContent,
                            result.modifiedContent,
                            fileName
                        );

                        // ✨ Store state and update status bar
                        pendingResult = result;
                        pendingEditor = editor;
                        showApplyStatusBar();

                        vscode.window.showInformationMessage(
                            `👀 Previewing ${fileName}. Click "Apply or Discard" in the status bar to finish.`
                        );
                    } else {
                        vscode.window.showWarningMessage('Could not show diff: missing content.');
                    }
                }
            } else {
                vscode.window.showErrorMessage(`Zenco ${featureName} failed: ${result.error}`);
            }
        });
    }

    // 4. Register Commands

    // ✨ NEW: Apply Pending Command
    context.subscriptions.push(
        vscode.commands.registerCommand('zenco-vscode.applyPending', async () => {
            if (!pendingResult || !pendingEditor) {
                vscode.window.showErrorMessage('No pending changes to apply.');
                resetStatusBar();
                return;
            }

            // Ask user what to do
            const choice = await vscode.window.showQuickPick(
                [
                    { label: '$(check) Apply Changes', description: 'Apply the previewed changes to the file', value: 'apply' },
                    { label: '$(x) Discard Changes', description: 'Cancel and discard these changes', value: 'discard' }
                ],
                { placeHolder: 'Apply or Discard pending changes?' }
            );

            if (!choice) {
                return; // User cancelled the menu
            }

            if (choice.value === 'discard') {
                // Discard logic
                pendingResult = null;
                pendingEditor = null;
                resetStatusBar();

                // Close diff editor
                await vscode.commands.executeCommand('workbench.action.closeActiveEditor');

                vscode.window.showInformationMessage('Changes discarded.');
                return;
            }

            // Apply logic
            const edit = new vscode.WorkspaceEdit();
            const fullRange = new vscode.Range(
                pendingEditor.document.positionAt(0),
                pendingEditor.document.positionAt(pendingEditor.document.getText().length)
            );

            edit.replace(pendingEditor.document.uri, fullRange, pendingResult.modifiedContent);
            await vscode.workspace.applyEdit(edit);

            vscode.window.showInformationMessage('✅ Changes applied successfully!');

            // Close diff editor
            await vscode.commands.executeCommand('workbench.action.closeActiveEditor');

            // Reset state
            pendingResult = null;
            pendingEditor = null;
            resetStatusBar();
        })
    );

    // Refactor File
    context.subscriptions.push(
        vscode.commands.registerCommand('zenco-vscode.refactorFile', () => {
            runZencoFeature('Refactor File', refactorFile, outputChannel, diffViewer);
        })
    );

    // Add Docstrings
    context.subscriptions.push(
        vscode.commands.registerCommand('zenco-vscode.addDocstrings', () => {
            runZencoFeature('Add Docstrings', addDocstrings, outputChannel, diffViewer);
        })
    );

    // Add Type Hints
    context.subscriptions.push(
        vscode.commands.registerCommand('zenco-vscode.addTypeHints', () => {
            runZencoFeature('Add Type Hints', addTypeHints, outputChannel, diffViewer);
        })
    );

    // Fix Magic Numbers
    context.subscriptions.push(
        vscode.commands.registerCommand('zenco-vscode.fixMagicNumbers', () => {
            runZencoFeature('Fix Magic Numbers', fixMagicNumbers, outputChannel, diffViewer);
        })
    );

    // Remove Dead Code
    context.subscriptions.push(
        vscode.commands.registerCommand('zenco-vscode.removeDeadCode', () => {
            runZencoFeature('Remove Dead Code', removeDeadCode, outputChannel, diffViewer);
        })
    );

    // Show Menu (Status Bar Click)
    context.subscriptions.push(
        vscode.commands.registerCommand('zenco-vscode.showMenu', async () => {
            const options = [
                { label: '$(beaker) Refactor File', command: 'zenco-vscode.refactorFile' },
                { label: '$(book) Add Docstrings', command: 'zenco-vscode.addDocstrings' },
                { label: '$(symbol-parameter) Add Type Hints', command: 'zenco-vscode.addTypeHints' },
                { label: '$(wand) Fix Magic Numbers', command: 'zenco-vscode.fixMagicNumbers' },
                { label: '$(trash) Remove Dead Code', command: 'zenco-vscode.removeDeadCode' }
            ];

            const selection = await vscode.window.showQuickPick(options, {
                placeHolder: 'Select a Zenco feature to run'
            });

            if (selection) {
                vscode.commands.executeCommand(selection.command);
            }
        })
    );

    // Hello World
    context.subscriptions.push(
        vscode.commands.registerCommand('zenco-vscode.helloWorld', () => {
            vscode.window.showInformationMessage('Hello World from zenco community!');
        })
    );
}

export function deactivate() { }