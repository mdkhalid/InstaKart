const timestamp = (): string => new Date().toISOString();

const isDev = (): boolean =>
  typeof process !== "undefined" && process.env.NODE_ENV === "development";

export const logger = {
  info: (message: string, ...args: any[]) => {
    if (isDev()) {
      console.log(`[${timestamp()}] INFO: ${message}`, ...args);
    }
  },
  warn: (message: string, ...args: any[]) => {
    console.warn(`[${timestamp()}] WARN: ${message}`, ...args);
  },
  error: (message: string, ...args: any[]) => {
    console.error(`[${timestamp()}] ERROR: ${message}`, ...args);
  },
  debug: (message: string, ...args: any[]) => {
    if (isDev()) {
      console.debug(`[${timestamp()}] DEBUG: ${message}`, ...args);
    }
  },
};
