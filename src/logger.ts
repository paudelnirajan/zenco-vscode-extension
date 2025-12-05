export class Logger {
    private static instance: Logger = new Logger();

    private constructor() {}

    public static getInstance(): Logger {
        return this.instance;
    }

    public info(message: string) {
        console.log("[INFO] " + message);
    }

    public warn(message: string) {
        console.warn("[WARN] " + message);
    }

    public error(message: string) {
        console.error("[ERROR] " + message);
    }
}
