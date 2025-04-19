import { Request, Response, NextFunction } from 'express';
import { CustomError } from '../utils/errors';
import { ZodError } from 'zod';

/**
 * Global error handling middleware for Express
 * Centralizes error handling and provides consistent error responses
 */
export function errorHandler(
  err: Error, 
  req: Request, 
  res: Response, 
  next: NextFunction
) {
  console.error('Error occurred:', err);

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Validation Error',
      message: 'The request data is invalid',
      details: err.errors
    });
  }

  // Handle our custom errors
  if (err instanceof CustomError) {
    return res.status(err.statusCode).json({
      error: err.name,
      message: err.message
    });
  }

  // Handle unknown errors
  return res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' 
      ? 'An unexpected error occurred' 
      : err.message
  });
}