import { eq, and, inArray, desc } from "drizzle-orm";
import {
  NewVerification,
  NewVerificationLog,
  Verification,
  VerificationLog,
  verificationLogs,
  verifications,
  VerificationStatus,
  VerificationType,
} from "./verification.schema";
import db from "../../config/database";
import { taskers } from "../../tasking/taskers/tasker.schema";
import { users } from "../users/user.schema";
import { AppError } from "../../utils/app-error";

export interface VerificationWithRelations extends Verification {
  logs?: VerificationLog[];
  tasker?: {
    id: number;
    headline?: string;
  };
  user?: {
    id: number;
    email: string;
    firstName?: string;
    lastName?: string;
  };
}

export class VerificationService {
  /**
   * Find all verifications with optional filtering
   */
  async findAll(
    options: {
      taskerId?: number;
      userId?: number;
      type?: VerificationType | VerificationType[];
      status?: VerificationStatus | VerificationStatus[];
      page?: number;
      limit?: number;
    } = {}
  ): Promise<VerificationWithRelations[]> {
    const { page = 1, limit = 20 } = options;

    // Build conditions array
    const conditions = [];

    if (options.taskerId) {
      conditions.push(eq(verifications.taskerId, options.taskerId));
    }

    if (options.userId) {
      conditions.push(eq(verifications.userId, options.userId));
    }

    if (options.type) {
      if (Array.isArray(options.type)) {
        conditions.push(inArray(verifications.type, options.type));
      } else {
        conditions.push(eq(verifications.type, options.type));
      }
    }

    if (options.status) {
      if (Array.isArray(options.status)) {
        conditions.push(inArray(verifications.status, options.status));
      } else {
        conditions.push(eq(verifications.status, options.status));
      }
    }

    // Execute query with pagination
    const results = await db
      .select()
      .from(verifications)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(verifications.createdAt))
      .limit(limit)
      .offset((page - 1) * limit);

    // Transform results to include relations
    return this.hydrateVerifications(results);
  }

  /**
   * Find a verification by ID
   */
  async findById(id: number): Promise<VerificationWithRelations | undefined> {
    const result = await db
      .select()
      .from(verifications)
      .where(eq(verifications.id, id))
      .limit(1);

    if (result.length === 0) {
      return undefined;
    }

    const [verification] = await this.hydrateVerifications(result);
    return verification;
  }

  /**
   * Find verifications by tasker ID
   */
  async findByTaskerId(taskerId: number): Promise<VerificationWithRelations[]> {
    const results = await db
      .select()
      .from(verifications)
      .where(eq(verifications.taskerId, taskerId))
      .orderBy(desc(verifications.createdAt));

    return this.hydrateVerifications(results);
  }

  /**
   * Find verifications by user ID
   */
  async findByUserId(userId: number): Promise<VerificationWithRelations[]> {
    const results = await db
      .select()
      .from(verifications)
      .where(eq(verifications.userId, userId))
      .orderBy(desc(verifications.createdAt));

    return this.hydrateVerifications(results);
  }

  /**
   * Check if a tasker has a verified document of a specific type
   */
  async hasVerifiedDocument(
    taskerId: number,
    type: VerificationType
  ): Promise<boolean> {
    const result = await db
      .select()
      .from(verifications)
      .where(
        and(
          eq(verifications.taskerId, taskerId),
          eq(verifications.type, type),
          eq(verifications.status, "verified")
        )
      )
      .limit(1);

    return result.length > 0;
  }

  /**
   * Create a new verification request
   */
  async create(
    data: Omit<NewVerification, "status" | "createdAt" | "updatedAt">
  ): Promise<VerificationWithRelations> {
    // Check if tasker exists
    const tasker = await db
      .select()
      .from(taskers)
      .where(eq(taskers.id, data.taskerId))
      .limit(1);

    if (tasker.length === 0) {
      throw new AppError("Tasker not found", 404);
    }

    // Check if user exists
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, data.userId))
      .limit(1);

    if (user.length === 0) {
      throw new AppError("User not found", 404);
    }

    // Check if a verification of this type is already in progress
    const existingVerification = await db
      .select()
      .from(verifications)
      .where(
        and(
          eq(verifications.taskerId, data.taskerId),
          eq(verifications.type, data.type),
          inArray(verifications.status, ["pending", "in_review"])
        )
      )
      .limit(1);

    if (existingVerification.length > 0) {
      throw new AppError(
        `A ${data.type} verification is already in progress`,
        400
      );
    }

    // Create verification
    const result = await db.transaction(async (tx) => {
      // Insert verification
      const verification = await tx
        .insert(verifications)
        .values({
          ...data,
          status: "pending",
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      // Create initial log entry
      await tx.insert(verificationLogs).values({
        verificationId: verification[0].id,
        status: "pending",
        message: "Verification request submitted",
        performedBy: data.userId,
        createdAt: new Date(),
      });

      return verification[0];
    });

    return this.findById(result.id) as Promise<VerificationWithRelations>;
  }

  /**
   * Update verification status
   */
  async updateStatus(
    id: number,
    status: VerificationStatus,
    options: {
      message?: string;
      performedBy?: number;
      rejectionReason?: string;
      metadata?: any;
    } = {}
  ): Promise<VerificationWithRelations | undefined> {
    const { message, performedBy, rejectionReason, metadata } = options;

    // Get current verification
    const verification = await this.findById(id);

    if (!verification) {
      return undefined;
    }

    // Validate status transition
    this.validateStatusTransition(verification.status, status);

    // Update verification
    const result = await db.transaction(async (tx) => {
      // Update verification status
      const updatedVerification = await tx
        .update(verifications)
        .set({
          status,
          verifiedAt:
            status === "verified" ? new Date() : verification.verifiedAt,
          rejectionReason:
            status === "rejected"
              ? rejectionReason
              : verification.rejectionReason,
          metadata: metadata
            ? { ...verification.metadata, ...metadata }
            : verification.metadata,
          updatedAt: new Date(),
        })
        .where(eq(verifications.id, id))
        .returning();

      // Create log entry
      await tx.insert(verificationLogs).values({
        verificationId: id,
        status,
        message: message || `Status updated to ${status}`,
        performedBy,
        metadata,
        createdAt: new Date(),
      });

      // If verified, update tasker verification flags
      if (status === "verified") {
        switch (verification.type) {
          case "bvn":
            await tx
              .update(taskers)
              .set({ identityVerified: true, updatedAt: new Date() })
              .where(eq(taskers.id, verification.taskerId));
            break;
          case "nin":
            await tx
              .update(taskers)
              .set({ identityVerified: true, updatedAt: new Date() })
              .where(eq(taskers.id, verification.taskerId));
            break;
          case "id_card":
          case "passport":
          case "drivers_license":
            await tx
              .update(taskers)
              .set({ identityVerified: true, updatedAt: new Date() })
              .where(eq(taskers.id, verification.taskerId));
            break;
        }
      }

      return updatedVerification[0];
    });

    return this.findById(result.id);
  }

  /**
   * Add verification log
   */
  async addLog(
    data: Omit<NewVerificationLog, "createdAt">
  ): Promise<VerificationLog> {
    // Check if verification exists
    const verification = await this.findById(data.verificationId);

    if (!verification) {
      throw new AppError("Verification not found", 404);
    }

    // Create log
    const result = await db
      .insert(verificationLogs)
      .values({
        ...data,
        createdAt: new Date(),
      })
      .returning();

    return result[0];
  }

  /**
   * Get verification logs
   */
  async getLogs(verificationId: number): Promise<VerificationLog[]> {
    return db
      .select()
      .from(verificationLogs)
      .where(eq(verificationLogs.verificationId, verificationId))
      .orderBy(desc(verificationLogs.createdAt));
  }

  /**
   * Hydrate verifications with relations
   */
  private async hydrateVerifications(
    verificationResults: Verification[]
  ): Promise<VerificationWithRelations[]> {
    if (verificationResults.length === 0) {
      return [];
    }

    const verificationIds = verificationResults.map((v) => v.id);
    const taskerIds = verificationResults.map((v) => v.taskerId);
    const userIds = verificationResults.map((v) => v.userId);

    // Create a map for quick lookup
    const verificationsById = new Map<number, VerificationWithRelations>();
    verificationResults.forEach((verification) => {
      verificationsById.set(verification.id, { ...verification, logs: [] });
    });

    // Fetch logs
    const logs = await db
      .select()
      .from(verificationLogs)
      .where(inArray(verificationLogs.verificationId, verificationIds))
      .orderBy(desc(verificationLogs.createdAt));

    // Group logs by verification ID
    logs.forEach((log) => {
      const verification = verificationsById.get(log.verificationId);
      if (verification) {
        if (!verification.logs) {
          verification.logs = [];
        }
        verification.logs.push(log);
      }
    });

    // Fetch taskers
    const taskerResults = await db
      .select({
        id: taskers.id,
        headline: taskers.headline,
      })
      .from(taskers)
      .where(inArray(taskers.id, taskerIds));

    const taskersById = new Map<number, (typeof taskerResults)[number]>();
    taskerResults.forEach((tasker) => {
      taskersById.set(tasker.id, tasker);
    });

    // Fetch users
    const userResults = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
      })
      .from(users)
      .where(inArray(users.id, userIds));

    const usersById = new Map<number, (typeof userResults)[number]>();
    userResults.forEach((user) => {
      usersById.set(user.id, user);
    });

    // Add relations to verifications
    const verificationWithRelations = Array.from(verificationsById.values());
    verificationWithRelations.forEach((verification) => {
      verification.tasker = taskersById.get(verification.taskerId);
      verification.user = usersById.get(verification.userId);
    });

    return verificationWithRelations;
  }

  /**
   * Validate verification status transition
   */
  private validateStatusTransition(
    currentStatus: string,
    newStatus: string
  ): void {
    // Define valid status transitions
    const validTransitions: Record<string, string[]> = {
      pending: ["in_review", "rejected"],
      in_review: ["verified", "rejected"],
      verified: [],
      rejected: ["pending"], // Allow resubmission after rejection
    };

    if (!validTransitions[currentStatus]?.includes(newStatus)) {
      throw new AppError(
        `Invalid status transition from ${currentStatus} to ${newStatus}`,
        400
      );
    }
  }

  /**
   * Verify BVN with external provider
   * This is a placeholder for integration with a real BVN verification service
   */
  async verifyBVN(
    bvn: string,
    userData: {
      firstName: string;
      lastName: string;
      dateOfBirth?: string;
      phoneNumber?: string;
    }
  ): Promise<{
    success: boolean;
    message: string;
    data?: any;
    reference?: string;
  }> {
    // This would be replaced with actual API call to a verification service
    // For now, we'll simulate a successful verification

    // Validate BVN format (11 digits for Nigeria)
    if (!/^\d{11}$/.test(bvn)) {
      return {
        success: false,
        message: "Invalid BVN format. BVN must be 11 digits.",
      };
    }

    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Simulate verification result
    const reference = `BVN_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    return {
      success: true,
      message: "BVN verification successful",
      data: {
        bvn: bvn,
        firstName: userData.firstName,
        lastName: userData.lastName,
        phoneNumber: userData.phoneNumber || "080********",
        dateOfBirth: userData.dateOfBirth || "****-**-**",
        isVerified: true,
      },
      reference,
    };
  }

  /**
   * Verify NIN with external provider
   * This is a placeholder for integration with a real NIN verification service
   */
  async verifyNIN(
    nin: string,
    userData: {
      firstName: string;
      lastName: string;
      dateOfBirth?: string;
      phoneNumber?: string;
    }
  ): Promise<{
    success: boolean;
    message: string;
    data?: any;
    reference?: string;
  }> {
    // This would be replaced with actual API call to a verification service
    // For now, we'll simulate a successful verification

    // Validate NIN format (11 digits for Nigeria)
    if (!/^\d{11}$/.test(nin)) {
      return {
        success: false,
        message: "Invalid NIN format. NIN must be 11 digits.",
      };
    }

    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Simulate verification result
    const reference = `NIN_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    return {
      success: true,
      message: "NIN verification successful",
      data: {
        nin: nin,
        firstName: userData.firstName,
        lastName: userData.lastName,
        phoneNumber: userData.phoneNumber || "080********",
        dateOfBirth: userData.dateOfBirth || "****-**-**",
        isVerified: true,
      },
      reference,
    };
  }
}

export const verificationService = new VerificationService();
