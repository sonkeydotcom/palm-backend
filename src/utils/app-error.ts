export class AppError extends Error {
  statusCode: number;
  isOperation: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.name = this.constructor.name;
    this.isOperation = true;
    Error.captureStackTrace(this, this.constructor);
  }
}
