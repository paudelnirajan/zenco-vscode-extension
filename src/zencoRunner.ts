import * as vscode from 'vscode';
import { exec } from 'child_process';
import { promisify } from 'util';
import { ZencoConfig } from './config';
import { Logger } from './logger';
import { checkCliInstallation } from './cliManager';

const execAsync = promisify(exec);

export interface ZencoResult {
    success: boolean;
    output?: string;
    error?: string;
    originalContent?: string;
    modifiedContent?: string;
    changes?: any[];
}

/**
 * Runs the Zenco CLI command on a file
 */
export async function runZencoCommand(
    filePath: string,
    options: string[] = ['--refactor']
): Promise<ZencoResult> {
    try {
        // ✨ Check if config is valid (has API key if using LLM)
        const configCheck = ZencoConfig.isConfigValid();
        if (!configCheck.valid) {
            return {
                success: false,
                error: configCheck.message
            };
        }

        // ✨ Build CLI arguments with configuration (provider, model, style, strategy)
        const cliArgs = ZencoConfig.buildCliArgs(options);

        // ✨ Always add --json flag
        // We use Set to avoid duplicates if options already has --json
        const uniqueOptions = Array.from(new Set([...cliArgs, '--json']));

        // ✨ Resolve CLI path (handles PATH issues)
        const cliCheck = await checkCliInstallation();
        const zencoExecutable = cliCheck.resolvedPath || 'zenco';

        const zencoCommand = `"${zencoExecutable}" run "${filePath}" ${uniqueOptions.join(' ')}`;
        Logger.getInstance().info('Running: ' + zencoCommand); // For debugging

        // ✨ Get environment variables with API key (passed securely via env, not CLI)
        const env = ZencoConfig.getEnvVars();

        const { stdout, stderr } = await execAsync(zencoCommand, { env });

        try {
            // ✨ NEW: Parse JSON output
            // Zenco might output some logs before JSON, so we look for the JSON object
            const jsonStart = stdout.indexOf('{');
            const jsonEnd = stdout.lastIndexOf('}');

            if (jsonStart === -1 || jsonEnd === -1) {
                throw new Error('No JSON output found');
            }

            const jsonStr = stdout.substring(jsonStart, jsonEnd + 1);
            const data = JSON.parse(jsonStr);

            // Check for errors in the JSON response
            if (data.errors && data.errors.length > 0) {
                return {
                    success: false,
                    error: data.errors[0].message
                };
            }

            // Get the result for the specific file
            // Since we usually process one file at a time in the extension
            const fileResult = data.results.find((r: any) => r.file === filePath) || data.results[0];

            if (!fileResult) {
                return { success: false, error: 'No result found for file' };
            }

            return {
                success: fileResult.success,
                output: formatOutput(fileResult), // Helper to format text for output panel
                originalContent: fileResult.original_content,
                modifiedContent: fileResult.modified_content,
                changes: fileResult.changes
            };

        } catch (parseError) {
            // Fallback for non-JSON output or parse errors
            Logger.getInstance().error('JSON Parse Error: ' + String(parseError));
            Logger.getInstance().info('Raw Output: ' + stdout);

            if (stderr && !stdout) {
                return { success: false, error: stderr };
            }
            return { success: true, output: stdout };
        }
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : String(error)
        };
    }
}

/**
 * Helper to format JSON result into readable text for the Output panel
 */
function formatOutput(result: any): string {
    let text = `Processed: ${result.file}\n`;

    if (result.stats) {
        text += `Stats: ${JSON.stringify(result.stats, null, 2)}\n`;
    }

    if (result.changes && result.changes.length > 0) {
        text += '\nChanges:\n';
        result.changes.forEach((change: any) => {
            text += `  [${change.type.toUpperCase()}] Line ${change.line}: ${change.description}\n`;
        });
    } else {
        text += '\nNo changes made.\n';
    }

    return text;
}

/**
 * Refactors the current file using Zenco
 * @param document - The VS Code document to refactor
 * @returns Promise with the refactored content
 */
export async function refactorFile(document: vscode.TextDocument): Promise<ZencoResult> {
    const filePath = document.uri.fsPath;
    return runZencoCommand(filePath, ['--refactor']);  // ✅ Pass options as array
}

/**
 * Adds docstrings to the current file
 */
export async function addDocstrings(document: vscode.TextDocument): Promise<ZencoResult> {
    const filePath = document.uri.fsPath;
    return runZencoCommand(filePath, ['--docstrings']);
}

/**
 * Adds type hints to the current file
 */
export async function addTypeHints(document: vscode.TextDocument): Promise<ZencoResult> {
    const filePath = document.uri.fsPath;
    return runZencoCommand(filePath, ['--add-type-hints']);
}

/**
 * Fixes magic numbers in the current file
 */
export async function fixMagicNumbers(document: vscode.TextDocument): Promise<ZencoResult> {
    const filePath = document.uri.fsPath;
    return runZencoCommand(filePath, ['--fix-magic-numbers']);
}

/**
 * Removes dead code from the current file
 */
export async function removeDeadCode(document: vscode.TextDocument): Promise<ZencoResult> {
    const filePath = document.uri.fsPath;
    return runZencoCommand(filePath, ['--dead-code']);
}

/**
 * Refactor file with strict mode (includes strict dead code removal)
 */
export async function refactorFileStrict(document: vscode.TextDocument): Promise<ZencoResult> {
    const filePath = document.uri.fsPath;
    return runZencoCommand(filePath, ['--refactor-strict']);
}

/**
 * Remove dead code with strict mode
 */
export async function removeDeadCodeStrict(document: vscode.TextDocument): Promise<ZencoResult> {
    const filePath = document.uri.fsPath;
    return runZencoCommand(filePath, ['--dead-code-strict']);
}

/**
 * Improve existing docstrings (overwrite poor quality ones)
 */
export async function improveDocstrings(document: vscode.TextDocument): Promise<ZencoResult> {
    const filePath = document.uri.fsPath;
    return runZencoCommand(filePath, ['--docstrings', '--overwrite-existing']);
}
