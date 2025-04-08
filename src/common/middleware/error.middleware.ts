import { NextFunction, Request, Response } from "express";
import { NODE_ENV } from "../config/env";
import { AppError } from "../utils/app-error";

const logError = (message: string, stack?: string) => {
  if (NODE_ENV !== "production") {
    console.error(`[ERROR]: ${message}`);
    if (stack) console.error(stack);
  } else {
    console.error(`[ERROR]: ${message}`);
    // Log to an external service (like Sentry, Loggly, or Winston) for better debugging
  }
};

// 404 Not Found Middleware
export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

export const errorHandler = (
  err: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
) => {
  if (err instanceof AppError) {
    res.status(err.statusCode);
  }
  const statusCode = res.statusCode >= 400 ? res.statusCode : 500;
  const statusMessage =
    statusCode === 404
      ? "Resource not found"
      : statusCode === 401
        ? "Unauthorized"
        : statusCode === 403
          ? "Forbidden"
          : statusCode === 400
            ? "Bad Request"
            : statusCode === 500
              ? "Internal Server Error"
              : "An error occured";

  const errorMessage = err instanceof Error ? err.message : String(err);
  const errorStack = err instanceof Error ? err.stack : undefined;

  logError(errorMessage, errorStack);

  res.status(statusCode).json({
    success: false,
    error: {
      code: statusCode,
      status: statusMessage,
      message: errorMessage,
      // ...(process.env.NODE_ENV !== "production" && { stack: errorStack }),
    },
    method: req.method,
    timestamp: new Date().toISOString(),
  });
};
