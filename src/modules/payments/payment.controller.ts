import { NextFunction, Request, Response } from "express";
import { AuthRequest } from "../../middleware/auth.middleware";
import { paymentService } from "./payment.service";
import {
  validatePayment,
  validatePaymentMethod,
} from "../../validators/payment-validator";

export class PaymentController {
  async createPayment(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      // Validate request
      const { error, value } = validatePayment(req.body);
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }

      // Ensure user can only create payments for themselves
      if (req.user?.id !== value.userId) {
        return res
          .status(403)
          .json({ error: "Not authorized to create payment for another user" });
      }

      // Create payment
      const payment = await paymentService.createPayment(value);

      return res.status(201).json(payment);
    } catch (error) {
      next(error);
    }
  }

  async getPaymentById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number.parseInt(req.params.id);
      const payment = await paymentService.getPaymentById(id);

      if (!payment) {
        return res.status(404).json({ error: "Payment not found" });
      }

      return res.json(payment);
    } catch (error) {
      next(error);
    }
  }

  async getPaymentsByUser(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const payments = await paymentService.getPaymentsByUserId(userId);
      return res.json(payments);
    } catch (error) {
      next(error);
    }
  }

  async getPaymentsByProvider(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const providerId = Number.parseInt(req.params.providerId);

      // In a real app, you would check if the user is authorized to view these payments

      const payments = await paymentService.getPaymentsByProviderId(providerId);
      return res.json(payments);
    } catch (error) {
      next(error);
    }
  }

  async processRefund(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const paymentId = Number.parseInt(req.params.id);
      const { amount, reason } = req.body;

      if (!amount || typeof amount !== "number" || amount <= 0) {
        return res
          .status(400)
          .json({ error: "Valid refund amount is required" });
      }

      // In a real app, you would check if the user is authorized to refund this payment

      const refundedPayment = await paymentService.processRefund(
        paymentId,
        amount,
        reason
      );
      return res.json(refundedPayment);
    } catch (error) {
      next(error);
    }
  }

  // Payment Methods
  async createPaymentMethod(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      // Validate request
      const { error, value } = validatePaymentMethod(req.body);
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }

      // Ensure user can only create payment methods for themselves
      if (req.user?.id !== value.userId) {
        return res.status(403).json({
          error: "Not authorized to create payment method for another user",
        });
      }

      // Create payment method
      const paymentMethod = await paymentService.createPaymentMethod(value);

      return res.status(201).json(paymentMethod);
    } catch (error) {
      next(error);
    }
  }

  async getPaymentMethods(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const paymentMethods =
        await paymentService.getPaymentMethodsByUserId(userId);
      return res.json(paymentMethods);
    } catch (error) {
      next(error);
    }
  }

  async updatePaymentMethod(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const id = Number.parseInt(req.params.id);

      // Get the payment method to check ownership
      const paymentMethod = await paymentService.getPaymentMethodById(id);

      if (!paymentMethod) {
        return res.status(404).json({ error: "Payment method not found" });
      }

      // Ensure user can only update their own payment methods
      if (req.user?.id !== paymentMethod.userId) {
        return res
          .status(403)
          .json({ error: "Not authorized to update this payment method" });
      }

      const updatedPaymentMethod = await paymentService.updatePaymentMethod(
        id,
        req.body
      );
      return res.json(updatedPaymentMethod);
    } catch (error) {
      next(error);
    }
  }

  async deletePaymentMethod(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const id = Number.parseInt(req.params.id);

      // Get the payment method to check ownership
      const paymentMethod = await paymentService.getPaymentMethodById(id);

      if (!paymentMethod) {
        return res.status(404).json({ error: "Payment method not found" });
      }

      // Ensure user can only delete their own payment methods
      if (req.user?.id !== paymentMethod.userId) {
        return res
          .status(403)
          .json({ error: "Not authorized to delete this payment method" });
      }

      const result = await paymentService.deletePaymentMethod(id);

      if (result) {
        return res.status(204).send();
      } else {
        return res.status(404).json({ error: "Payment method not found" });
      }
    } catch (error) {
      next(error);
    }
  }
}

export const paymentController = new PaymentController();
