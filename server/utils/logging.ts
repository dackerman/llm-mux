/**
 * Centralized logging utility
 * This enables better control over log format and level
 * and makes it easier to mock logs in tests
 */

enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

// Default to INFO in production, DEBUG in development
const DEFAULT_LOG_LEVEL = process.env.NODE_ENV === 'production' 
  ? LogLevel.INFO 
  : LogLevel.DEBUG;

// Current log level (can be changed at runtime)
let currentLogLevel = DEFAULT_LOG_LEVEL;

/**
 * Set the current log level
 * @param level New log level to use
 */
export function setLogLevel(level: LogLevel): void {
  currentLogLevel = level;
}

/**
 * Log a debug message (only in development)
 * @param message Message to log
 * @param optionalParams Additional parameters to log
 */
export function debug(message: string, ...optionalParams: any[]): void {
  if (currentLogLevel <= LogLevel.DEBUG) {
    console.debug(`[DEBUG] ${message}`, ...optionalParams);
  }
}

/**
 * Log an info message
 * @param message Message to log
 * @param optionalParams Additional parameters to log
 */
export function info(message: string, ...optionalParams: any[]): void {
  if (currentLogLevel <= LogLevel.INFO) {
    console.info(`[INFO] ${message}`, ...optionalParams);
  }
}

/**
 * Log a warning message
 * @param message Message to log
 * @param optionalParams Additional parameters to log
 */
export function warn(message: string, ...optionalParams: any[]): void {
  if (currentLogLevel <= LogLevel.WARN) {
    console.warn(`[WARN] ${message}`, ...optionalParams);
  }
}

/**
 * Log an error message
 * @param message Message to log
 * @param optionalParams Additional parameters to log
 */
export function error(message: string, ...optionalParams: any[]): void {
  if (currentLogLevel <= LogLevel.ERROR) {
    console.error(`[ERROR] ${message}`, ...optionalParams);
  }
}

// Export the LogLevel enum for use in tests/configuration
export { LogLevel };