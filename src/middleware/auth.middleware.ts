import { NextFunction, Request, Response } from "express";
import { User } from "../modules/users/user.schema";
import { AppError } from "../utils/app-error";
import { authService } from "../modules/auth/auth.service";

export interface AuthRequest extends Request {
  user?: Partial<User>;
}

export const authenticate = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization ?? "";

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new AppError("Missing or invalid authorization token", 401);
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      throw new AppError("Missing authorization token", 401);
    }

    const decoded = authService.verifyToken(token) as User;

    req.user = {
      id: decoded.id,
      username: decoded.username,
      email: decoded.email,
      role: decoded.role,
    };

    next();
  } catch (error) {
    next(error);
  }
};

export const authprize = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError("Authentication required", 401));
    }

    if (!roles.includes(req.user.role as string)) {
      return next(new AppError("Not authorized to access this resource", 403));
    }

    next();
  };
};
