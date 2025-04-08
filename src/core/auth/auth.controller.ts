import type { Request, Response, NextFunction } from "express";

import { authService } from "./auth.service";
import {
  validateLogin,
  validateRegister,
} from "../../common/validators/auth.validator";
import { success } from "../../common/utils/api-response";

export class AuthController {
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      // Validate request
      const { error, value } = validateLogin(req.body);
      if (error) {
        res.status(400).json({ error: error.details[0].message });
        return;
      }

      // Login user
      const result = await authService.login(value.email, value.password);

      // Return response
      success(res, result, "User logged in successfully");
      return;
    } catch (error) {
      next(error);
    }
  }

  async register(req: Request, res: Response, next: NextFunction) {
    try {
      // Validate request
      const { error, value } = validateRegister(req.body);
      if (error) {
        res.status(400).json({ error: error.details[0].message });
        return;
      }
      // Register user
      const result = await authService.register(value);

      // Return response
      success(res, result, "User logged in successfully");
      return;
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();
