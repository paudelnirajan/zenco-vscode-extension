import * as vscode from 'vscode';
import {
    refactorFile,
    addDocstrings,
    addTypeHints,
    fixMagicNumbers,
    removeDeadCode,
    runZencoCommand
} from './zencoRunner';

/**
 * Helper to apply Zenco results to the editor
 */
async function applyZencoResult(
    editor: vscode.TextEditor,
    result: any,
    featureName: string,
    applyChanges: boolean,
    outputChannel: vscode.OutputChannel
) {
    if (result.success) {
        // Show output in panel
        if (result.output) {
            outputChannel.clear();
            outputChannel.appendLine(`=== Zenco: ${featureName} Results ===`);
            outputChannel.appendLine(result.output);
            outputChannel.show(true);
        }

        if (applyChanges) {
            if (result.modifiedContent) {
                // Apply changes directly to the editor using WorkspaceEdit
                const edit = new vscode.WorkspaceEdit();

                // Calculate the full range of the document
                const lastLine = editor.document.lineAt(editor.document.lineCount - 1);
                const fullRange = new vscode.Range(
                    new vscode.Position(0, 0),
                    lastLine.range.end
                );

                console.log(`Applying ${featureName} edit to range:`, fullRange.start.line, fullRange.end.line);

                edit.replace(editor.document.uri, fullRange, result.modifiedContent);
                const success = await vscode.workspace.applyEdit(edit);

                if (success) {
                    vscode.window.showInformationMessage(
                        `✅ ${featureName} applied successfully!`
                    );
                } else {
                    vscode.window.showErrorMessage(
                        `❌ Failed to apply edits to ${editor.document.fileName}`
                    );
                }
            } else {
                vscode.window.showWarningMessage('No changes returned from Zenco.');
            }
        } else {
            // Preview Mode
            vscode.window.showInformationMessage(
                `👀 ${featureName} preview ready! Check the Output panel.`
            );
        }
    } else {
        vscode.window.showErrorMessage(`Zenco ${featureName} failed: ${result.error}`);
    }
}

/**
 * Helper function to run a Zenco feature with consistent UX
 */
async function runZencoFeature(
    featureName: string,
    featureFunction: (doc: vscode.TextDocument) => Promise<any>,
    outputChannel: vscode.OutputChannel
) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showErrorMessage('No file is currently open!');
        return;
    }

    // Ask user: Preview or Apply?
    const choice = await vscode.window.showQuickPick(
        ['Preview Changes', 'Apply Changes'],
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
        await applyZencoResult(editor, result, featureName, applyChanges, outputChannel);
    });
}

export function activate(context: vscode.ExtensionContext) {
    console.log('Congratulations, your extension "zenco" is now active!');

    // Create an output channel for Zenco
    const outputChannel = vscode.window.createOutputChannel('Zenco');

    // ✨ NEW: Create status bar item
    const statusBarItem = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Right,  // Position on the right side
        100  // Priority (higher = more to the left)
    );
    statusBarItem.text = "$(zap) Zenco";  // ⚡ icon + text
    statusBarItem.tooltip = "Click to refactor current file with Zenco";
    statusBarItem.command = "zenco-vscode.showMenu";  // Command to run when clicked
    statusBarItem.show();  // Make it visible

    const disposable = vscode.commands.registerCommand('zenco-vscode.helloWorld', () => {
        vscode.window.showInformationMessage('Hello World from zenco community!');
    });

    const refactorCommand = vscode.commands.registerCommand('zenco-vscode.refactorFile', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No file is currently open!');
            return;
        }

        // ✨ Ask user: Preview or Apply?
        const choice = await vscode.window.showQuickPick(
            ['Preview Changes', 'Apply Changes'],
            {
                placeHolder: 'Do you want to preview or apply the refactoring?'
            }
        );

        if (!choice) {
            return; // User cancelled
        }

        const applyChanges = choice === 'Apply Changes';

        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: applyChanges ? 'Zenco: Applying changes...' : 'Zenco: Previewing changes...',
            cancellable: false
        }, async (progress) => {
            const options = ['--refactor'];
            const result = await runZencoCommand(editor.document.uri.fsPath, options);
            await applyZencoResult(editor, result, 'Refactor File', applyChanges, outputChannel);
        });
    });

    // ✨ NEW: Add Docstrings command
    const addDocstringsCommand = vscode.commands.registerCommand('zenco-vscode.addDocstrings', async () => {
        await runZencoFeature('Add Docstrings', addDocstrings, outputChannel);
    });

    // ✨ NEW: Add Type Hints command
    const addTypeHintsCommand = vscode.commands.registerCommand('zenco-vscode.addTypeHints', async () => {
        await runZencoFeature('Add Type Hints', addTypeHints, outputChannel);
    });

    // ✨ NEW: Fix Magic Numbers command
    const fixMagicNumbersCommand = vscode.commands.registerCommand('zenco-vscode.fixMagicNumbers', async () => {
        await runZencoFeature('Fix Magic Numbers', fixMagicNumbers, outputChannel);
    });

    // ✨ NEW: Remove Dead Code command
    const removeDeadCodeCommand = vscode.commands.registerCommand('zenco-vscode.removeDeadCode', async () => {
        await runZencoFeature('Remove Dead Code', removeDeadCode, outputChannel);
    });

    // ✨ NEW: Show Feature Menu command
    const showMenuCommand = vscode.commands.registerCommand('zenco-vscode.showMenu', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No file is currently open!');
            return;
        }

        // Step 1: Choose feature
        const feature = await vscode.window.showQuickPick([
            {
                label: '$(rocket) Refactor',
                description: 'Full refactor: docstrings, type hints, magic numbers, dead code',
                value: 'refactor'
            },
            {
                label: '$(book) Add Docstrings',
                description: 'Generate docstrings for functions and classes',
                value: 'docstrings'
            },
            {
                label: '$(symbol-parameter) Add Type Hints',
                description: 'Add type annotations to function parameters',
                value: 'typeHints'
            },
            {
                label: '$(symbol-numeric) Fix Magic Numbers',
                description: 'Replace magic numbers with named constants',
                value: 'magicNumbers'
            },
            {
                label: '$(trash) Remove Dead Code',
                description: 'Remove unused imports, variables, and functions',
                value: 'deadCode'
            }
        ], {
            placeHolder: 'Choose a Zenco feature'
        });

        if (!feature) {
            return; // User cancelled
        }

        // Step 2: Choose action (Preview or Apply)
        const action = await vscode.window.showQuickPick([
            {
                label: '$(eye) Preview Changes',
                description: 'See what changes will be made (dry run)',
                value: 'preview'
            },
            {
                label: '$(check) Apply Changes',
                description: 'Apply changes to the file',
                value: 'apply'
            }
        ], {
            placeHolder: `${feature.label}: Preview or Apply?`
        });

        if (!action) {
            return; // User cancelled
        }

        const applyChanges = action.value === 'apply';

        // Step 3: Run the selected feature
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `Zenco: ${feature.label}...`,
            cancellable: false
        }, async (progress) => {
            let result;

            // Map feature to the appropriate function
            switch (feature.value) {
                case 'refactor':
                    result = await runZencoCommand(
                        editor.document.uri.fsPath,
                        ['--refactor']
                    );
                    break;
                case 'docstrings':
                    result = await runZencoCommand(
                        editor.document.uri.fsPath,
                        ['--docstrings']
                    );
                    break;
                case 'typeHints':
                    result = await runZencoCommand(
                        editor.document.uri.fsPath,
                        ['--add-type-hints']
                    );
                    break;
                case 'magicNumbers':
                    result = await runZencoCommand(
                        editor.document.uri.fsPath,
                        ['--fix-magic-numbers']
                    );
                    break;
                case 'deadCode':
                    result = await runZencoCommand(
                        editor.document.uri.fsPath,
                        ['--dead-code']
                    );
                    break;
            }

            if (result) {
                await applyZencoResult(editor, result, feature.label, applyChanges, outputChannel);
            }
        });
    });

    // Register all commands
    context.subscriptions.push(
        disposable,
        refactorCommand,
        addDocstringsCommand,
        addTypeHintsCommand,
        fixMagicNumbersCommand,
        removeDeadCodeCommand,
        outputChannel,
        statusBarItem,
        showMenuCommand
    );
}

// This method is called when your extension is deactivated
export function deactivate() { }
