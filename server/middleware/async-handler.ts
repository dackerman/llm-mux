import { Request, Response, NextFunction } from 'express';

/**
 * Wrapper for async route handlers to catch and forward errors to the error handler middleware
 * This eliminates the need for try/catch blocks in every route handler
 * 
 * @param fn Async function to wrap
 * @returns Wrapped function that forwards errors to next()
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}