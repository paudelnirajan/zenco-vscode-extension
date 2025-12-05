import * as vscode from 'vscode';
import { exec } from 'child_process';
import { promisify } from 'util';
import { Logger } from '../logger';
// Convert callback-based exec to Promise-based
const execAsync = promisify(exec);
export class ZencoRunner {
    /**
     * Runs Zenco CLI on a file
     * @param filePath - Absolute path to the file to process
     * @param options - Zenco options (e.g., --refactor, --in-place)
     * @returns Promise with the output
     */
    async runZenco(filePath: string, options: string[]): Promise<string> {
        try {
            // Build the command
            const command = `zenco run "${filePath}" ${options.join(' ')}`;

            vscode.window.showInformationMessage(`Running: ${command}`);

            // Execute the command
            const { stdout, stderr } = await execAsync(command);

            if (stderr) {
                Logger.getInstance().error('Zenco stderr: ' + stderr);
            }

            return stdout;
        } catch (error: any) {
            vscode.window.showErrorMessage(`Zenco error: ${error.message}`);
            throw error;
        }
    }
}
