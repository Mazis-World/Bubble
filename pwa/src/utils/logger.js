/**
 * Production-safe logging utility
 * In production, only errors are logged
 * In development, all logs are shown
 */

const isDevelopment = process.env.NODE_ENV === 'development';

export const logger = {
  log: (...args) => {
    if (isDevelopment) {
      console.log(...args);
    }
  },
  
  info: (...args) => {
    if (isDevelopment) {
      console.info(...args);
    }
  },
  
  warn: (...args) => {
    // Warnings are shown in both dev and prod
    console.warn(...args);
  },
  
  error: (...args) => {
    // Errors are always logged
    console.error(...args);
    
    // In production, you might want to send errors to an error tracking service
    if (!isDevelopment) {
      // TODO: Integrate with error tracking service (e.g., Sentry, LogRocket)
      // Example: Sentry.captureException(new Error(args.join(' ')));
    }
  },
  
  debug: (...args) => {
    if (isDevelopment) {
      console.debug(...args);
    }
  }
};

export default logger;
