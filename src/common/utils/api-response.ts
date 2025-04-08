/* eslint-disable @typescript-eslint/no-explicit-any */

import { Response } from "express";

/**
 * Standard API response structure
 */
export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  meta?: {
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
    [key: string]: any;
  };
  timestamp: string;
}

/**
 * Creates a standardized success response
 * @param data The data to include in the response
 * @param message Optional success message
 * @param meta Optional metadata (pagination, etc.)
 * @param statusCode HTTP status code (default: 200)
 * @param res Express response object
 * @returns Standardized API response object
 */
export function success<T>(
  res: Response,
  data: T,
  message?: string,
  statusCode = 200,
  meta?: ApiResponse<T>["meta"]
): Response<T> {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    meta,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Creates a standardized pagination metadata object
 * @param page Current page number
 * @param limit Items per page
 * @param total Total number of items
 * @returns Pagination metadata object
 */
export function paginationMeta(
  page: number,
  limit: number,
  total: number
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): ApiResponse<any>["meta"] {
  const totalPages = Math.ceil(total / limit);

  return {
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
  };
}
