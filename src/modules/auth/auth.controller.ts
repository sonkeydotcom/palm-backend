import type { Request, Response, NextFunction } from "express";

import { authService } from "./auth.service";
import {
  validateLogin,
  validateRegister,
} from "../../validators/auth.validator";

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
      res.json(result);
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
      res.status(201).json(result);
      return;
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();
