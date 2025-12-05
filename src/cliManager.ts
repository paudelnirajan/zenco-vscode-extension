import * as vscode from 'vscode';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs';

const execAsync = promisify(exec);

/**
 * Minimum required version of zenco CLI
 */
const MINIMUM_ZENCO_VERSION = '0.1.0'; // Update this to your actual minimum version

/**
 * Result of CLI check operation
 */
export interface CliCheckResult {
    installed: boolean;
    version?: string;
    needsUpgrade?: boolean;
    pythonPath?: string;
    resolvedPath?: string;
}

/**
 * Check if zenco CLI is installed and get its version
 */
export async function checkCliInstallation(): Promise<CliCheckResult> {
    try {
        // Resolve the zenco executable path
        const zencoPath = await resolveZencoPath();

        // Try to run zenco --help using the resolved path (since --version is not supported)
        const command = `"${zencoPath}" --help`;
        const { stdout } = await execAsync(command);

        // Parse version from output (format: "Zenco AI v1.2.0")
        const versionMatch = stdout.match(/Zenco AI v(\d+\.\d+\.\d+)/);

        if (versionMatch) {
            const version = versionMatch[1];
            const needsUpgrade = compareVersions(version, MINIMUM_ZENCO_VERSION) < 0;

            return {
                installed: true,
                version,
                needsUpgrade,
                resolvedPath: zencoPath
            };
        }

        // Version found but couldn't parse it
        return {
            installed: true,
            version: 'unknown',
            needsUpgrade: false,
            resolvedPath: zencoPath
        };

    } catch (error) {
        console.error(`CLI check failed: ${error}`);
        // Command failed - zenco is not installed or not in PATH
        // BUT if we resolved a path, return it anyway so we can try to use it
        return {
            installed: false,
            resolvedPath: await resolveZencoPath() // Try to resolve again just in case
        };
    }
}

/**
 * Helper to resolve zenco executable path
 */
async function resolveZencoPath(): Promise<string> {
    // 1. Try global PATH first (simplest)
    try {
        await execAsync('zenco --help');
        return 'zenco';
    } catch {
        // Continue to check specific paths
    }

    // 2. Try to ask pipx where binaries are
    try {
        const { stdout } = await execAsync('pipx environment --value PIPX_BIN_DIR');
        const pipxBin = stdout.trim();
        const zencoPath = path.join(pipxBin, process.platform === 'win32' ? 'zenco.exe' : 'zenco');
        if (fs.existsSync(zencoPath)) {
            return zencoPath;
        }
    } catch (e) {
        // pipx not found or failed
    }

    // 3. Try to ask Python where user scripts are (pip --user)
    try {
        const pythonCmd = await findPython() || 'python3';
        const script = "import sysconfig, os; print(sysconfig.get_path('scripts', os.name + '_user'))";
        const { stdout } = await execAsync(`${pythonCmd} -c "${script}"`);
        const userBin = stdout.trim();
        const zencoPath = path.join(userBin, process.platform === 'win32' ? 'zenco.exe' : 'zenco');
        if (fs.existsSync(zencoPath)) {
            return zencoPath;
        }
    } catch (e) {
        // Python failed
    }

    // 4. Fallback to common hardcoded paths
    const home = process.env.HOME || process.env.USERPROFILE || '';

    const commonPaths = [
        // macOS/Linux pip --user & pipx default
        path.join(home, '.local', 'bin', 'zenco'),
        // pipx fallback (isolated venv)
        path.join(home, '.local', 'pipx', 'venvs', 'zenco', 'bin', 'zenco'),
        // Homebrew (Apple Silicon)
        '/opt/homebrew/bin/zenco',
        // Homebrew (Intel)
        '/usr/local/bin/zenco',
        // Windows pip --user
        path.join(home, 'AppData', 'Roaming', 'Python', 'Scripts', 'zenco.exe'),
        // Windows pipx
        path.join(home, '.local', 'bin', 'zenco.exe')
    ];

    for (const p of commonPaths) {
        if (fs.existsSync(p)) {
            return p;
        }
    }

    // 5. Default to 'zenco' if nothing found
    return 'zenco';
}

/**
 * Find Python installation
 */
export async function findPython(): Promise<string | null> {
    const pythonCommands = ['python3', 'python', 'py'];

    for (const cmd of pythonCommands) {
        try {
            const { stdout } = await execAsync(`${cmd} --version`);
            // Check if it's Python 3.x (zenco requires Python 3)
            if (stdout.includes('Python 3')) {
                return cmd;
            }
        } catch (error) {
            // This command doesn't exist, try next one
            continue;
        }
    }

    return null; // No Python found
}

/**
 * STEP 4a: Check if pipx is available
 * 
 * Why? pipx is the BEST way to install CLI tools on modern systems
 * It creates isolated environments automatically and handles PEP 668
 * 
 * How? Try to run `pipx --version`
 */
/**
 * Check if pipx is available
 */
async function checkPipxAvailable(): Promise<boolean> {
    try {
        await execAsync('pipx --version');
        return true;
    } catch {
        return false;
    }
}

/**
 * Check if Homebrew is available (macOS/Linux)
 */
async function checkBrewAvailable(): Promise<boolean> {
    try {
        await execAsync('brew --version');
        return true;
    } catch {
        return false;
    }
}

/**
 * Install pipx using the best available method
 */
async function installPipx(pythonCmd: string): Promise<boolean> {
    const hasBrew = await checkBrewAvailable();

    return new Promise((resolve) => {
        const terminal = vscode.window.createTerminal({ name: 'Install pipx' });
        terminal.show();

        if (hasBrew) {
            vscode.window.showInformationMessage('Installing pipx via Homebrew...');
            terminal.sendText('brew install pipx');
        } else {
            vscode.window.showInformationMessage('Installing pipx via pip...');
            terminal.sendText(`${pythonCmd} -m pip install --user pipx`);
            terminal.sendText(`${pythonCmd} -m pipx ensurepath`);
        }

        terminal.sendText('echo "PIPX_INSTALL_COMPLETE"');

        // Wait for user to confirm
        setTimeout(async () => {
            const choice = await vscode.window.showInformationMessage(
                'Is pipx installation complete?',
                'Yes, Continue',
                'No, Failed'
            );

            if (choice === 'Yes, Continue') {
                resolve(await checkPipxAvailable());
            } else {
                resolve(false);
            }
        }, 5000);
    });
}

/**
 * STEP 4b: Determine best installation method
 * 
 * Why? Modern macOS and Linux have PEP 668 protection (externally-managed-environment)
 * We need to use the right method based on what's available
 * 
 * Priority:
 * 1. pipx (best for CLI tools, handles isolation automatically)
 * 2. pip --user (safe, user-level install)
 * 3. Manual instructions (if all else fails)
 */
/**
 * Determine best installation method
 */
async function determineInstallMethod(): Promise<{
    method: 'pipx' | 'pipx-missing' | 'pip-user' | 'manual';
    command?: string;
}> {
    // Check if pipx is available
    const hasPipx = await checkPipxAvailable();
    if (hasPipx) {
        return { method: 'pipx', command: 'pipx' };
    }

    // If pipx is missing, we should try to install it first
    // This is the "Failsafe" approach
    return { method: 'pipx-missing' };
}

/**
 * Install zenco CLI using the best available method
 * 
 * @param pythonCmd - The Python command to use (python3, python, etc.)
 * @param upgrade - Whether to upgrade existing installation
 */
/**
 * Validate that zenco is in the PATH
 */
async function validatePath(): Promise<boolean> {
    const result = await checkCliInstallation();
    if (result.installed) {
        return true;
    }

    // Installation succeeded but command not found -> PATH issue
    vscode.window.showInformationMessage(
        'Zenco CLI installed! If you see errors, try restarting VS Code to refresh your PATH.',
        'Show Help'
    ).then(async selection => {
        if (selection === 'Show Help') {
            await showManualInstallInstructions(false);
        }
    });

    return false;
}

export async function installCli(pythonCmd: string, upgrade: boolean = false): Promise<boolean> {
    // Determine the best installation method
    let installMethod = await determineInstallMethod();

    // Handle pipx-missing case
    if (installMethod.method === 'pipx-missing') {
        const choice = await vscode.window.showInformationMessage(
            'Zenco requires "pipx" for a safe installation. Install pipx now?',
            'Install pipx',
            'Try fallback (pip --user)'
        );

        if (choice === 'Install pipx') {
            const pipxInstalled = await installPipx(pythonCmd);
            if (pipxInstalled) {
                installMethod = { method: 'pipx', command: 'pipx' };
            } else {
                vscode.window.showErrorMessage('Failed to install pipx. Falling back to pip --user.');
                installMethod = { method: 'pip-user' };
            }
        } else {
            installMethod = { method: 'pip-user' };
        }
    }

    return new Promise(async (resolve) => {
        let installCommand: string;
        let terminalName: string;
        let successMessage: string;

        if (installMethod.method === 'pipx') {
            const action = upgrade ? 'upgrade' : 'install';
            installCommand = `pipx ${action} zenco`;
            terminalName = 'Zenco CLI Installation (pipx)';
            successMessage = upgrade
                ? '⚡ Upgrading Zenco CLI with pipx...'
                : '⚡ Installing Zenco CLI with pipx...';
        } else {
            const upgradeFlag = upgrade ? ' --upgrade' : '';
            installCommand = `${pythonCmd} -m pip install --user zenco${upgradeFlag}`;
            terminalName = 'Zenco CLI Installation (pip --user)';
            successMessage = upgrade
                ? '⚡ Upgrading Zenco CLI with pip --user...'
                : '⚡ Installing Zenco CLI with pip --user...';
        }

        const terminal = vscode.window.createTerminal({ name: terminalName });
        terminal.show();
        vscode.window.showInformationMessage(successMessage);

        terminal.sendText(installCommand);
        terminal.sendText('echo "ZENCO_INSTALL_COMPLETE"');

        setTimeout(async () => {
            const choice = await vscode.window.showInformationMessage(
                'Installation running. Click "Verify" when complete.',
                'Verify Installation',
                'Show Manual Instructions'
            );

            if (choice === 'Verify Installation') {
                const isValid = await validatePath();
                if (isValid) {
                    const result = await checkCliInstallation();
                    vscode.window.showInformationMessage(`✅ Zenco CLI ${result.version} installed!`);
                    resolve(true);
                } else {
                    resolve(false);
                }
            } else if (choice === 'Show Manual Instructions') {
                await showManualInstallInstructions(upgrade);
                resolve(false);
            } else {
                resolve(false);
            }
        }, 3000);
    });
}

/**
 * Main function to ensure CLI is ready
 * 
 * @param context - VS Code extension context (for storing state)
 * @param force - Force showing the prompt even if previously dismissed
 */
export async function ensureCliInstalled(
    context: vscode.ExtensionContext,
    force: boolean = false
): Promise<boolean> {
    // Check current installation status
    const cliCheck = await checkCliInstallation();

    // Case 1: CLI is installed and up-to-date
    if (cliCheck.installed && !cliCheck.needsUpgrade) {
        return true;
    }

    // Case 2: CLI needs upgrade
    if (cliCheck.installed && cliCheck.needsUpgrade) {
        const choice = await vscode.window.showWarningMessage(
            `Zenco CLI ${cliCheck.version} is outdated. Minimum required: ${MINIMUM_ZENCO_VERSION}. Upgrade now?`,
            'Upgrade',
            'Later',
            'Manual Instructions'
        );

        if (choice === 'Upgrade') {
            const pythonCmd = await findPython();
            if (pythonCmd) {
                return await installCli(pythonCmd, true);
            } else {
                await showManualInstallInstructions(true);
                return false;
            }
        } else if (choice === 'Manual Instructions') {
            await showManualInstallInstructions(true);
        }

        return false;
    }

    // Case 3: CLI is not installed
    // Check if user previously dismissed the prompt
    const dismissedKey = 'zenco.installPromptDismissed';
    const wasDismissed = context.globalState.get(dismissedKey, false);

    if (wasDismissed && !force) {
        // Don't show prompt again, but return false
        return false;
    }

    const choice = await vscode.window.showWarningMessage(
        'Zenco CLI is not installed. Would you like to install it now?',
        'Install',
        'Manual Instructions',
        'Don\'t Show Again'
    );

    if (choice === 'Install') {
        const pythonCmd = await findPython();
        if (pythonCmd) {
            const success = await installCli(pythonCmd, false);
            if (success) {
                // Clear dismissed flag on successful install
                await context.globalState.update(dismissedKey, false);
            }
            return success;
        } else {
            vscode.window.showErrorMessage(
                'Python 3 not found. Please install Python 3 first, then try again.'
            );
            await showManualInstallInstructions(false);
            return false;
        }
    } else if (choice === 'Manual Instructions') {
        await showManualInstallInstructions(false);
        return false;
    } else if (choice === 'Don\'t Show Again') {
        // Remember user's choice
        await context.globalState.update(dismissedKey, true);
        return false;
    }

    return false;
}

/**
 * Show manual installation instructions
 */
async function showManualInstallInstructions(isUpgrade: boolean) {
    const instructions = isUpgrade
        ? `# Upgrade Zenco CLI

To upgrade Zenco CLI manually, choose one of these methods:

## Method 1: pipx (Recommended for macOS/Linux)

\`\`\`bash
pipx upgrade zenco
\`\`\`

If you don't have pipx, install it first:
\`\`\`bash
brew install pipx  # macOS
# or
python3 -m pip install --user pipx
\`\`\`

## Method 2: pip --user (Safe on all systems)

\`\`\`bash
pip install --user --upgrade zenco
# or
python3 -m pip install --user --upgrade zenco
\`\`\`

## Method 3: Regular pip (if you have permissions)

\`\`\`bash
pip install --upgrade zenco
# or
pip3 install --upgrade zenco
\`\`\`

After upgrade, reload VS Code or run "Zenco: Check CLI Installation".
`
        : `# Install Zenco CLI

Choose the best installation method for your system:

## Method 1: pipx (Recommended for macOS/Linux)

Best for CLI tools - creates isolated environment automatically:

\`\`\`bash
pipx install zenco
\`\`\`

If you don't have pipx, install it first:
\`\`\`bash
brew install pipx  # macOS with Homebrew
# or
python3 -m pip install --user pipx
\`\`\`

## Method 2: pip --user (Safe on all systems)

Installs to your user directory (no admin/sudo needed):

\`\`\`bash
pip install --user zenco
# or
python3 -m pip install --user zenco
\`\`\`

**Note:** Make sure \`~/.local/bin\` is in your PATH.

## Method 3: Regular pip (if you have permissions)

\`\`\`bash
pip install zenco
# or
pip3 install zenco
\`\`\`

## Troubleshooting

### "externally-managed-environment" error (macOS/Linux)

This is normal on modern systems. Use Method 1 (pipx) or Method 2 (pip --user) instead.

### Python not found

- macOS: \`brew install python3\`
- Linux: \`sudo apt install python3 python3-pip\`
- Windows: Download from https://www.python.org/downloads/

### Command not found after install

Add Python scripts directory to your PATH:
- macOS/Linux: \`~/.local/bin\` (for --user installs)
- macOS/Linux: pipx adds to PATH automatically
- Windows: \`%APPDATA%\\Python\\Scripts\`

After installation, reload VS Code or run "Zenco: Check CLI Installation".
`;

    // Create a new untitled document with instructions
    try {
        const doc = await vscode.workspace.openTextDocument({
            content: instructions,
            language: 'markdown'
        });
        await vscode.window.showTextDocument(doc);
    } catch (error) {
        console.error(`Failed to open instructions: ${error}`);
        vscode.window.showErrorMessage('Could not open manual instructions. Please check the Output panel for details.');
    }
}

/**
 * Compare semantic versions
 * 
 * @returns -1 if v1 < v2, 0 if equal, 1 if v1 > v2
 */
function compareVersions(v1: string, v2: string): number {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);

    for (let i = 0; i < 3; i++) {
        const num1 = parts1[i] || 0;
        const num2 = parts2[i] || 0;

        if (num1 > num2) return 1;
        if (num1 < num2) return -1;
    }

    return 0;
}
