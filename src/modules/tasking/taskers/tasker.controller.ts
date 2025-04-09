import type { Request, Response, NextFunction } from "express";
import { TaskerSearchParams, taskerService } from "./tasker.service";
import { success } from "../../../common/utils/api-response";
import { AppError } from "../../../common/utils/app-error";
import { AuthRequest } from "../../../common/middleware/auth.middleware";
import {
  validateTasker,
  validateTaskerPortfolioItem,
  validateTaskerSkill,
} from "../../../common/validators/tasker-validator";
// paginationMeta

export class TaskerController {
  async getAllTaskers(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        query,
        serviceId,
        serviceSlug,
        locationId,
        minRate,
        maxRate,
        minRating,
        isElite,
        isBackgroundChecked,
        isIdentityVerified,
        sort,
        order,
        page = "1",
        limit = "20",
        includeInactive,
      } = req.query;

      // Parse and validate search parameters
      const searchParams: TaskerSearchParams = {
        query: query as string,
        serviceId: serviceId ? Number(serviceId) : undefined,
        serviceSlug: serviceSlug as string,
        locationId: locationId ? Number(locationId) : undefined,
        // city: city as string,
        // state: state as string,
        // country: country as string,
        // postalCode: postalCode as string,
        // radius: radius ? Number(radius) : undefined,
        // latitude: latitude ? Number(latitude) : undefined,
        // longitude: longitude ? Number(longitude) : undefined,
        minRate: minRate ? Number(minRate) : undefined,
        maxRate: maxRate ? Number(maxRate) : undefined,
        minRating: minRating ? Number(minRating) : undefined,
        isElite:
          isElite === "true" ? true : isElite === "false" ? false : undefined,
        isBackgroundChecked:
          isBackgroundChecked === "true"
            ? true
            : isBackgroundChecked === "false"
              ? false
              : undefined,
        isIdentityVerified:
          isIdentityVerified === "true"
            ? true
            : isIdentityVerified === "false"
              ? false
              : undefined,
        sort: sort as TaskerSearchParams["sort"],
        order: order as "asc" | "desc",
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
        includeInactive: includeInactive === "true",
      };

      // Get total count for pagination
      // const countParams = { ...searchParams };
      // delete countParams.page;
      // delete countParams.limit;
      // delete countParams.sort;
      // delete countParams.order;

      // const total = await taskerService.count(countParams);

      // Get taskers with pagination
      const taskers = await taskerService.findAll(searchParams);

      // Create pagination metadata
      // const meta = paginationMeta(
      //   searchParams.page || 1,
      //   searchParams.limit || 20,
      //   total
      // );

      success(res, taskers, "Taskers retrieved successfully");
    } catch (error) {
      next(error);
    }
  }

  async getTaskerById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      const tasker = await taskerService.findById(id);

      if (!tasker) {
        throw new AppError("Tasker not found", 404);
      }

      success(res, tasker, "Tasker retrieved successfully");
    } catch (error) {
      next(error);
    }
  }

  async getTaskerByUserId(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = Number(req.params.userId);
      const tasker = await taskerService.findByUserId(userId);

      if (!tasker) {
        throw new AppError("Tasker not found", 404);
      }

      success(res, tasker, "Tasker retrieved successfully");
    } catch (error) {
      next(error);
    }
  }

  async getTopTaskers(req: Request, res: Response, next: NextFunction) {
    try {
      const { limit } = req.query;
      const taskers = await taskerService.getTopTaskers(
        limit ? Number(limit) : undefined
      );

      success(res, taskers, "Top taskers retrieved successfully");
    } catch (error) {
      next(error);
    }
  }

  async getTaskersByService(req: Request, res: Response, next: NextFunction) {
    try {
      const serviceId = Number(req.params.serviceId);
      const { limit } = req.query;

      const taskers = await taskerService.getTaskersByService(
        serviceId,
        limit ? Number(limit) : undefined
      );

      success(res, taskers, "Taskers by service retrieved successfully");
    } catch (error) {
      next(error);
    }
  }

  async createTasker(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      // Ensure user can only create a tasker profile for themselves
      if (req.user?.id !== req.body.userId) {
        throw new AppError(
          "Not authorized to create tasker profile for another user",
          403
        );
      }

      // Validate request
      const { error, value } = validateTasker(req.body);
      if (error) {
        throw new AppError(error.details[0].message, 400);
      }

      // Create tasker
      const tasker = await taskerService.create(value);

      success(res, tasker, "Tasker profile created successfully");
    } catch (error) {
      next(error);
    }
  }

  async updateTasker(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);

      // Get the tasker to check ownership
      const tasker = await taskerService.findById(id);

      if (!tasker) {
        throw new AppError("Tasker not found", 404);
      }

      // Ensure user can only update their own tasker profile
      if (req.user?.id !== tasker.userId && req.user?.role !== "admin") {
        throw new AppError("Not authorized to update this tasker profile", 403);
      }

      // Validate request
      const { error, value } = validateTasker(req.body, true);
      if (error) {
        throw new AppError(error.details[0].message, 400);
      }

      // Update tasker
      const updatedTasker = await taskerService.update(id, value);

      success(res, updatedTasker, "Tasker profile updated successfully");
    } catch (error) {
      next(error);
    }
  }

  // Tasker Skills
  async addTaskerSkill(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const taskerId = Number(req.params.id);

      // Get the tasker to check ownership
      const tasker = await taskerService.findById(taskerId);

      if (!tasker) {
        throw new AppError("Tasker not found", 404);
      }

      // Ensure user can only update their own tasker profile
      if (req.user?.id !== tasker.userId && req.user?.role !== "admin") {
        throw new AppError("Not authorized to update this tasker profile", 403);
      }

      // Validate request
      const { error, value } = validateTaskerSkill(req.body);
      if (error) {
        throw new AppError(error.details[0].message, 400);
      }

      // Add skill
      const skill = await taskerService.addSkill(taskerId, value);

      success(res, skill, "Skill added successfully");
    } catch (error) {
      next(error);
    }
  }

  async updateTaskerSkill(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const taskerId = Number(req.params.id);
      const skillId = Number(req.params.skillId);

      // Get the tasker to check ownership
      const tasker = await taskerService.findById(taskerId);

      if (!tasker) {
        throw new AppError("Tasker not found", 404);
      }

      // Ensure user can only update their own tasker profile
      if (req.user?.id !== tasker.userId && req.user?.role !== "admin") {
        throw new AppError("Not authorized to update this tasker profile", 403);
      }

      // Validate request
      const { error, value } = validateTaskerSkill(req.body, true);
      if (error) {
        throw new AppError(error.details[0].message, 400);
      }

      // Update skill
      const skill = await taskerService.updateSkill(taskerId, skillId, value);

      if (!skill) {
        throw new AppError("Skill not found", 404);
      }

      success(res, skill, "Skill updated successfully");
    } catch (error) {
      next(error);
    }
  }

  async removeTaskerSkill(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const taskerId = Number(req.params.id);
      const skillId = Number(req.params.skillId);

      // Get the tasker to check ownership
      const tasker = await taskerService.findById(taskerId);

      if (!tasker) {
        throw new AppError("Tasker not found", 404);
      }

      // Ensure user can only update their own tasker profile
      if (req.user?.id !== tasker.userId && req.user?.role !== "admin") {
        throw new AppError("Not authorized to update this tasker profile", 403);
      }

      // Remove skill
      const result = await taskerService.removeSkill(taskerId, skillId);

      if (!result) {
        throw new AppError("Skill not found", 404);
      }

      success(res, { success: true }, "Skill removed successfully");
    } catch (error) {
      next(error);
    }
  }

  // Tasker Portfolio
  async addPortfolioItem(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const taskerId = Number(req.params.id);

      // Get the tasker to check ownership
      const tasker = await taskerService.findById(taskerId);

      if (!tasker) {
        throw new AppError("Tasker not found", 404);
      }

      // Ensure user can only update their own tasker profile
      if (req.user?.id !== tasker.userId && req.user?.role !== "admin") {
        throw new AppError("Not authorized to update this tasker profile", 403);
      }

      // Validate request
      const { error, value } = validateTaskerPortfolioItem(req.body);
      if (error) {
        throw new AppError(error.details[0].message, 400);
      }

      // Add portfolio item
      const item = await taskerService.addPortfolioItem(taskerId, value);

      success(res, item, "Portfolio item added successfully");
    } catch (error) {
      next(error);
    }
  }

  async updatePortfolioItem(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const taskerId = Number(req.params.id);
      const itemId = Number(req.params.itemId);

      // Get the tasker to check ownership
      const tasker = await taskerService.findById(taskerId);

      if (!tasker) {
        throw new AppError("Tasker not found", 404);
      }

      // Ensure user can only update their own tasker profile
      if (req.user?.id !== tasker.userId && req.user?.role !== "admin") {
        throw new AppError("Not authorized to update this tasker profile", 403);
      }

      // Validate request
      const { error, value } = validateTaskerPortfolioItem(req.body, true);
      if (error) {
        throw new AppError(error.details[0].message, 400);
      }

      // Update portfolio item
      const item = await taskerService.updatePortfolioItem(
        taskerId,
        itemId,
        value
      );

      if (!item) {
        throw new AppError("Portfolio item not found", 404);
      }

      success(res, item, "Portfolio item updated successfully");
    } catch (error) {
      next(error);
    }
  }

  async removePortfolioItem(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const taskerId = Number(req.params.id);
      const itemId = Number(req.params.itemId);

      // Get the tasker to check ownership
      const tasker = await taskerService.findById(taskerId);

      if (!tasker) {
        throw new AppError("Tasker not found", 404);
      }

      // Ensure user can only update their own tasker profile
      if (req.user?.id !== tasker.userId && req.user?.role !== "admin") {
        throw new AppError("Not authorized to update this tasker profile", 403);
      }

      // Remove portfolio item
      const result = await taskerService.removePortfolioItem(taskerId, itemId);

      if (!result) {
        throw new AppError("Portfolio item not found", 404);
      }

      success(res, { success: true }, "Portfolio item removed successfully");
    } catch (error) {
      next(error);
    }
  }
}

export const taskerController = new TaskerController();
