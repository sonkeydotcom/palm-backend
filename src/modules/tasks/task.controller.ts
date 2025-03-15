import { NextFunction, Response } from "express";
import { AuthRequest } from "../../middleware/auth.middleware";
import { TaskSearchParams, taskService } from "./task.service";
import { success } from "../../utils/api-response";
import { AppError } from "../../utils/app-error";

export class TaskController {
  async getAllTasks(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const {
        query,
        categoryId,
        categorySlug,
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
        categoryId: categoryId ? parseInt(categoryId as string) : undefined,
        categorySlug: categorySlug as string,
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
}

export const taskController = new TaskController();
