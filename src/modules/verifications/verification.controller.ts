import type { Response, NextFunction } from "express";
import { AuthRequest } from "../../middleware/auth.middleware";
import { AppError } from "../../utils/app-error";
import { VerificationStatus, VerificationType } from "./verification.schema";
import { verificationService } from "./verification.service";
import {
  validateVerification,
  validateVerificationStatus,
} from "../../validators/verification-validator";
import { success } from "../../utils/api-response";

export class VerificationController {
  /**
   * Get all verifications (admin only)
   */
  async getAllVerifications(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      // Only admins can see all verifications
      if (req.user?.role !== "admin") {
        throw new AppError("Not authorized to access all verifications", 403);
      }

      const {
        taskerId,
        userId,
        type,
        status,
        page = "1",
        limit = "20",
      } = req.query;

      // Parse query parameters
      const options = {
        taskerId: taskerId ? Number(taskerId) : undefined,
        userId: userId ? Number(userId) : undefined,
        type: type as VerificationType | VerificationType[],
        status: status as VerificationStatus | VerificationStatus[],
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
      };

      // Get verifications
      const verifications = await verificationService.findAll(options);

      // For pagination, we would need a count method in the service
      // For now, we'll just return the results
      success(res,verifications, "Verifications retrieved successfully")
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get verifications for the current user
   */
  async getUserVerifications(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      if (!req.user?.id) {
        throw new AppError("Authentication required", 401);
      }

      const verifications = await verificationService.findByUserId(req.user.id);

      success(res,
          verifications,
          "User verifications retrieved successfully"
        )
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get verifications for a tasker
   */
  async getTaskerVerifications(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const taskerId = Number(req.params.taskerId);

      // Verify the user is the tasker or an admin
      // This would require a lookup to verify the tasker's userId matches the current user
      // For simplicity, we'll assume this check is done elsewhere or modify as needed

      const verifications = await verificationService.findByTaskerId(taskerId);

      success(res,
          verifications,
          "Tasker verifications retrieved successfully"
        )
      
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get a verification by ID
   */
  async getVerificationById(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const id = Number(req.params.id);
      const verification = await verificationService.findById(id);

      if (!verification) {
        throw new AppError("Verification not found", 404);
      }

      // Check if the user is authorized to view this verification
      if (
        req.user?.id !== verification.userId &&
        req.user?.id !== verification.tasker?.user?.id &&
        req.user?.role !== "admin"
      ) {
        throw new AppError("Not authorized to view this verification", 403);
      }

      success(res,verification, "Verification retrieved successfully")
      
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create a new verification request
   */
  async createVerification(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      if (!req.user?.id) {
        throw new AppError("Authentication required", 401);
      }

      // Validate request
      const { error, value } = validateVerification(req.body);
      if (error) {
        throw new AppError(error.details[0].message, 400);
      }

      // Ensure user can only create verifications for themselves
      if (req.user.id !== value.userId) {
        throw new AppError(
          "Not authorized to create verification for another user",
          403
        );
      }

      // Create verification
      const verification = await verificationService.create({
        ...value,
        userId: req.user.id,
      });

      return res
        .status(201)
        .json(
          successResponse(
            verification,
            "Verification request submitted successfully"
          )
        );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update verification status (admin only)
   */
  async updateVerificationStatus(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      // Only admins can update verification status
      if (req.user?.role !== "admin") {
        throw new AppError("Not authorized to update verification status", 403);
      }

      const id = Number(req.params.id);

      // Validate request
      const { error, value } = validateVerificationStatus(req.body);
      if (error) {
        throw new AppError(error.details[0].message, 400);
      }

      // Update verification status
      const verification = await verificationService.updateStatus(
        id,
        value.status,
        {
          message: value.message,
          performedBy: req.user.id,
          rejectionReason: value.rejectionReason,
          metadata: value.metadata,
        }
      );

      if (!verification) {
        throw new AppError("Verification not found", 404);
      }

      success(res,
          verification,
          `Verification status updated to ${value.status}`
        )
      
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get verification logs
   */
  async getVerificationLogs(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const id = Number(req.params.id);
      const verification = await verificationService.findById(id);

      if (!verification) {
        throw new AppError("Verification not found", 404);
      }

      // Check if the user is authorized to view this verification's logs
      if (
        req.user?.id !== verification.userId &&
        req.user?.id !== verification.tasker?.user?.id &&
        req.user?.role !== "admin"
      ) {
        throw new AppError(
          "Not authorized to view this verification's logs",
          403
        );
      }

      const logs = await verificationService.getLogs(id);

      success(res,logs, "Verification logs retrieved successfully")
      
    } catch (error) {
      next(error);
    }
  }

  /**
   * Verify BVN
   */
  async verifyBVN(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user?.id) {
        throw new AppError("Authentication required", 401);
      }

      const { bvn, firstName, lastName, dateOfBirth, phoneNumber } = req.body;

      if (!bvn || !firstName || !lastName) {
        throw new AppError("BVN, first name, and last name are required", 400);
      }

      // Verify BVN with external provider
      const result = await verificationService.verifyBVN(bvn, {
        firstName,
        lastName,
        dateOfBirth,
        phoneNumber,
      });

      if (!result.success) {
        return
      }

      success(res, result, "BVN verification successful" )
      
    } catch (error) {
      next(error);
    }
  }

  /**
   * Verify NIN
   */
  async verifyNIN(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user?.id) {
        throw new AppError("Authentication required", 401);
      }

      const { nin, firstName, lastName, dateOfBirth, phoneNumber } = req.body;

      if (!nin || !firstName || !lastName) {
        throw new AppError("NIN, first name, and last name are required", 400);
      }

      // Verify NIN with external provider
      const result = await verificationService.verifyNIN(nin, {
        firstName,
        lastName,
        dateOfBirth,
        phoneNumber,
      });

      if (!result.success) {
        success(res, result, result.message, )
      }

      success(res,result, "NIN verification successful" )
      
    } catch (error) {
      next(error);
    }
  }
}

export const verificationController = new VerificationController();
