import * as vscode from 'vscode';

export class ZencoConfig {
    /**
     * Get the current Zenco configuration
     */
    static getConfig() {
        const config = vscode.workspace.getConfiguration('zenco');

        return {
            provider: config.get<string>('provider', 'groq'),
            apiKey: config.get<string>('apiKey', ''),
            model: config.get<string>('model', ''),
            docstringStyle: config.get<string>('docstringStyle', 'google'),
            strategy: config.get<string>('strategy', 'llm')
        };
    }

    /**
     * Build CLI arguments from configuration
     */
    static buildCliArgs(baseArgs: string[]): string[] {
        const config = this.getConfig();
        const args = [...baseArgs];

        // Add provider if set
        if (config.provider) {
            args.push('--provider', config.provider);
        }

        // Add model if set
        if (config.model) {
            args.push('--model', config.model);
        }

        // Add docstring style
        args.push('--style', config.docstringStyle);

        // Add strategy
        args.push('--strategy', config.strategy);

        return args;
    }

    /**
     * Get environment variables for Zenco CLI
     * This passes the API key securely via environment variable
     */
    static getEnvVars(): NodeJS.ProcessEnv {
        const config = this.getConfig();
        const env = { ...process.env };

        // Set the appropriate API key environment variable based on provider
        if (config.apiKey) {
            switch (config.provider) {
                case 'groq':
                    env.GROQ_API_KEY = config.apiKey;
                    break;
                case 'openai':
                    env.OPENAI_API_KEY = config.apiKey;
                    break;
                case 'anthropic':
                    env.ANTHROPIC_API_KEY = config.apiKey;
                    break;
                case 'gemini':
                    env.GEMINI_API_KEY = config.apiKey;
                    break;
            }
        }

        return env;
    }

    /**
     * Check if configuration is valid (has API key if using LLM)
     */
    static isConfigValid(): { valid: boolean; message?: string } {
        const config = this.getConfig();

        if (config.strategy === 'llm' && !config.apiKey) {
            return {
                valid: false,
                message: `No API key configured for ${config.provider}. Please set it in VS Code settings (Zenco: API Key).`
            };
        }

        return { valid: true };
    }
}