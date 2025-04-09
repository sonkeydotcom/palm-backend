import { NextFunction, Response } from "express";
import { TaskSearchParams, taskService } from "./task.service";
import { AuthRequest } from "../../../common/middleware/auth.middleware";
import { success } from "../../../common/utils/api-response";
import { AppError } from "../../../common/utils/app-error";
import { validateTask } from "../../../common/validators/task-validator";

export class TaskController {
  async getAllTasks(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const {
        query,
        serviceId,
        serviceSlug,
        minRate,
        maxRate,
        tags,
        isFeatured,
        isPopular,
        locationId,
        city,
        state,
        country,
        postalCode,
        radius,
        latitude,
        longitude,
        sort,
        order,
        page = "1",
        limit = "20",
        includeInactive,
      } = req.query;
      const searchParams: TaskSearchParams = {
        query: query as string,
        serviceId: serviceId ? parseInt(serviceId as string) : undefined,
        serviceSlug: serviceSlug as string,
        minRate: minRate ? parseInt(minRate as string) : undefined,
        maxRate: maxRate ? parseInt(maxRate as string) : undefined,
        tags: tags
          ? Array.isArray(tags)
            ? (tags as string[])
            : [tags as string]
          : undefined,
        isFeatured: isFeatured === "true" ? true : false,
        isPopular: isPopular === "true" ? true : false,
        locationId: locationId ? parseInt(locationId as string) : undefined,
        city: city as string,
        state: state as string,
        country: country as string,
        postalCode: postalCode as string,
        radius: radius ? parseFloat(radius as string) : undefined,
        latitude: latitude ? parseFloat(latitude as string) : undefined,
        longitude: longitude ? parseFloat(longitude as string) : undefined,
        sort: sort as
          | "name"
          | "rate"
          | "rating"
          | "createdAt"
          | "distance"
          | undefined,
        order: order as "asc" | "desc" | undefined,
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        includeInactive: includeInactive === "true" ? true : false,
      };
      const tasks = await taskService.findAll(searchParams);

      if (tasks.length === 0) {
        success(res, [], "No tasks found matching the provided criteria", 204);
      }
      success(res, tasks, "Tasks retrieved successfully", 200);
      return;
    } catch (error) {
      next(error);
    }
  }

  async getTaskById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = Number.parseInt(req.params.id);
      if (isNaN(id) || !id) {
        throw new AppError("Invalid ID: must be a number", 400);
      }
      const task = await taskService.findById(id);

      if (!task) {
        throw new AppError("Task not found", 404);
      }
      success(res, task, "Task retrieved successfully", 200);
    } catch (error) {
      next(error);
    }
  }

  async getTaskBySlug(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { slug } = req.params;
      const task = await taskService.findBySlug(slug);
      if (!task) {
        throw new AppError("Task not found", 404);
      }
      success(res, task, "Task retrieved successfully", 200);
    } catch (error) {
      next(error);
    }
  }

  async getFeaturedTasks(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { limit } = req.query;
      const tasks = await taskService.getFeaturedTasks(
        limit ? Number.parseInt(limit as string) : undefined
      );

      if (tasks.length === 0) {
        success(res, [], "No featured tasks found", 204);
      }

      success(res, tasks, "Featured tasks retrieved successfully", 200);
    } catch (error) {
      next(error);
    }
  }

  async getPoplularTaks(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { limit } = req.query;
      const tasks = await taskService.getPopularTasks(
        limit ? Number.parseInt(limit as string) : undefined
      );

      if (tasks.length === 0) {
        success(res, [], "No popular tasks found", 204);
      }

      success(res, tasks, "Popular tasks retrieved successfully", 200);
    } catch (error) {
      next(error);
    }
  }

  async getRelatedTasks(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = Number.parseInt(req.params.locationId);
      const { limit } = req.query;
      const tasks = await taskService.getRelatedTasks(
        id,
        limit ? Number.parseInt(limit as string) : undefined
      );

      if (tasks.length === 0) {
        success(res, [], "No related tasks found", 204);
      }

      success(res, tasks, "Related tasks retrieved successfully", 200);
    } catch (error) {
      next(error);
    }
  }

  async createTask(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      // Validate request
      const { error, value } = validateTask(req.body);
      if (error) {
        throw new AppError(error.details[0].message, 400);
      }

      // Create the task
      const task = await taskService.create(value);
      success(res, task, "Task created successfully", 201);
    } catch (error) {
      next(error);
    }
  }

  async updateTask(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = Number.parseInt(req.params.id);

      // Validate request

      const { error, value } = validateTask(req.body, true);

      if (error) {
        throw new AppError(error.details[0].message, 400);
      }

      // Update task

      const task = await taskService.update(id, value);

      if (!task) {
        throw new AppError("Task not found", 404);
      }

      success(res, task, "Task updated successfully", 200);
    } catch (error) {
      next(error);
    }
  }
  async deleteTask(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = Number.parseInt(req.params.id);

      const result = await taskService.delete(id);

      if (!result) {
        throw new AppError("Task not found", 404);
      }

      success(res, { deleted: true }, "Task deleted successfully");
    } catch (error) {
      next(error);
    }
  }

  async toggleTaskActive(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = Number.parseInt(req.params.id);
      const { isActive } = req.body;

      if (isActive === undefined || typeof isActive !== "boolean") {
        throw new AppError("isActive boolean is required", 400);
      }

      const task = await taskService.toggleActive(id, isActive);

      if (!task) {
        throw new AppError("Task not found", 404);
      }

      success(
        res,
        task,
        `Task ${isActive ? "activated" : "deactivated"} successfully`
      );
    } catch (error) {
      next(error);
    }
  }
}

export const taskController = new TaskController();
