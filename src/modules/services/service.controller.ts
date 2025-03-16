import type { Request, Response, NextFunction } from "express";

import { AuthRequest } from "../../middleware/auth.middleware";
import { validateService } from "../../validators/task-validator";
import { success } from "../../utils/api-response";
import { AppError } from "../../utils/app-error";
import { serviceService } from "./service.service";

export class ServiceController {
  async getAllServices(req: Request, res: Response, next: NextFunction) {
    try {
      const { includeInactive, parentId, sort, order } = req.query;

      const categories = await serviceService.findAll({
        includeInactive: includeInactive === "true",
        parentId:
          parentId === "null"
            ? null
            : parentId
              ? Number.parseInt(parentId as string)
              : undefined,
        sort: sort as string,
        order: (order as "asc" | "desc") || "asc",
      });

      return res.json(categories);
    } catch (error) {
      next(error);
    }
  }

  async getServiceById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number.parseInt(req.params.id);
      const service = await serviceService.findById(id);

      if (!service) {
        return res.status(404).json({ error: "Service not found" });
      }

      return res.json(service);
    } catch (error) {
      next(error);
    }
  }

  async getServiceBySlug(req: Request, res: Response, next: NextFunction) {
    try {
      const { slug } = req.params;
      const service = await serviceService.findBySlug(slug);

      if (!service) {
        return res.status(404).json({ error: "Service not found" });
      }

      return res.json(service);
    } catch (error) {
      next(error);
    }
  }

  async searchServices(req: Request, res: Response, next: NextFunction) {
    try {
      const { query } = req.query;

      if (!query || typeof query !== "string") {
        return res.status(400).json({ error: "Search query is required" });
      }

      const categories = await serviceService.search(query);
      success(res, categories, "categories retrieved successfully");
    } catch (error) {
      next(error);
    }
  }

  async createService(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      // Validate request
      const { error, value } = validateService(req.body);
      if (error) {
        throw new AppError(error.details[0].message, 400);
      }

      // Create service
      const service = await serviceService.create(value);

      success(res, service, "Service created successfully", 201);
    } catch (error) {
      next(error);
    }
  }

  async updateService(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = Number.parseInt(req.params.id);

      // Validate request
      const { error, value } = validateService(req.body, true);
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }

      // Update service
      const service = await serviceService.update(id, value);

      if (!service) {
        return res.status(404).json({ error: "Service not found" });
      }

      return res.json(service);
    } catch (error) {
      next(error);
    }
  }

  async deleteService(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = Number.parseInt(req.params.id);

      const result = await serviceService.delete(id);

      if (!result) {
        return res.status(404).json({ error: "Service not found" });
      }

      return res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  async toggleServiceActive(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const id = Number.parseInt(req.params.id);
      const { isActive } = req.body;

      if (isActive === undefined || typeof isActive !== "boolean") {
        return res.status(400).json({ error: "isActive boolean is required" });
      }

      const service = await serviceService.toggleActive(id, isActive);

      if (!service) {
        return res.status(404).json({ error: "Service not found" });
      }

      return res.json(service);
    } catch (error) {
      next(error);
    }
  }
}

export const serviceController = new ServiceController();
