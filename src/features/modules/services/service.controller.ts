import type { Request, Response, NextFunction } from "express";
import {
  serviceService,
  type ServiceListingParams,
} from "../services/service-service";
import { successResponse, paginationMeta } from "../utils/api-response";
import { AppError } from "../utils/app-error";
import type { AuthRequest } from "../middleware/auth-middleware";
import { validateService } from "../utils/validators";

export class ServiceController {
  /**
   * Get all services with optional filtering and pagination
   */
  async getAllServices(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        categoryId,
        search,
        sort,
        order,
        page = "1",
        limit = "20",
      } = req.query;

      // Parse query parameters
      const params: ServiceListingParams = {
        categoryId: categoryId ? Number(categoryId) : undefined,
        search: search as string,
        sort: sort as "popular" | "rating" | "price" | "newest",
        order: order as "asc" | "desc",
        page: Number(page),
        limit: Number(limit),
      };

      // Get total count for pagination
      const total = await serviceService.countServices({
        categoryId: params.categoryId,
        search: params.search,
      });

      // Get services
      const services = await serviceService.getServices(params);

      // Create pagination metadata
      const meta = paginationMeta(params.page || 1, params.limit || 20, total);

      return res.json(
        successResponse(services, "Services retrieved successfully", meta)
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get a service by ID with its taskers
   */
  async getServiceById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      const service = await serviceService.getServiceById(id);

      if (!service) {
        throw new AppError("Service not found", 404);
      }

      return res.json(
        successResponse(service, "Service retrieved successfully")
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get a service by slug with its taskers
   */
  async getServiceBySlug(req: Request, res: Response, next: NextFunction) {
    try {
      const { slug } = req.params;
      const service = await serviceService.getServiceBySlug(slug);

      if (!service) {
        throw new AppError("Service not found", 404);
      }

      return res.json(
        successResponse(service, "Service retrieved successfully")
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get featured services for homepage
   */
  async getFeaturedServices(req: Request, res: Response, next: NextFunction) {
    try {
      const { limit } = req.query;
      const services = await serviceService.getFeaturedServices(
        limit ? Number(limit) : undefined
      );

      return res.json(
        successResponse(services, "Featured services retrieved successfully")
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get popular services
   */
  async getPopularServices(req: Request, res: Response, next: NextFunction) {
    try {
      const { limit } = req.query;
      const services = await serviceService.getPopularServices(
        limit ? Number(limit) : undefined
      );

      return res.json(
        successResponse(services, "Popular services retrieved successfully")
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get taskers for a specific service
   */
  async getTaskersForService(req: Request, res: Response, next: NextFunction) {
    try {
      const serviceId = Number(req.params.serviceId);

      // Verify service exists
      const service = await serviceService.getServiceById(serviceId);
      if (!service) {
        throw new AppError("Service not found", 404);
      }

      const {
        latitude,
        longitude,
        radius,
        minRating,
        minPrice,
        maxPrice,
        date,
        sort,
        order,
        page = "1",
        limit = "20",
      } = req.query;

      // Get taskers for this service
      const result = await serviceService.getTaskersForService(serviceId, {
        location:
          latitude && longitude
            ? {
                latitude: Number(latitude),
                longitude: Number(longitude),
                radius: radius ? Number(radius) : 50,
              }
            : undefined,
        minRating: minRating ? Number(minRating) : undefined,
        minPrice: minPrice ? Number(minPrice) : undefined,
        maxPrice: maxPrice ? Number(maxPrice) : undefined,
        availability: date ? { date: new Date(date as string) } : undefined,
        sort: sort as "rating" | "price" | "distance" | "completedTasks",
        order: order as "asc" | "desc",
        page: Number(page),
        limit: Number(limit),
      });

      // Create pagination metadata
      const meta = paginationMeta(Number(page), Number(limit), result.total);

      return res.json(
        successResponse(
          {
            service: {
              id: service.id,
              name: service.name,
              description: service.description,
              image: service.image,
              category: service.category,
            },
            taskers: result.taskers,
          },
          "Taskers for service retrieved successfully",
          meta
        )
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get services by category
   */
  async getServicesByCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const categoryId = Number(req.params.categoryId);
      const { search, sort, order, page = "1", limit = "20" } = req.query;

      // Parse query parameters
      const params: Omit<ServiceListingParams, "categoryId"> = {
        search: search as string,
        sort: sort as "popular" | "rating" | "price" | "newest",
        order: order as "asc" | "desc",
        page: Number(page),
        limit: Number(limit),
      };

      // Get total count for pagination
      const total = await serviceService.countServices({
        categoryId,
        search: params.search,
      });

      const services = await serviceService.getServicesByCategory(
        categoryId,
        params
      );

      // Create pagination metadata
      const meta = paginationMeta(params.page || 1, params.limit || 20, total);

      return res.json(
        successResponse(
          services,
          "Services by category retrieved successfully",
          meta
        )
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Search services
   */
  async searchServices(req: Request, res: Response, next: NextFunction) {
    try {
      const { q } = req.query;

      if (!q || typeof q !== "string") {
        throw new AppError("Search query is required", 400);
      }

      const { sort, order, page = "1", limit = "20" } = req.query;

      // Parse query parameters
      const params: Omit<ServiceListingParams, "search"> = {
        sort: sort as "popular" | "rating" | "price" | "newest",
        order: order as "asc" | "desc",
        page: Number(page),
        limit: Number(limit),
      };

      // Get total count for pagination
      const total = await serviceService.countServices({
        search: q,
      });

      const services = await serviceService.searchServices(q, params);

      // Create pagination metadata
      const meta = paginationMeta(params.page || 1, params.limit || 20, total);

      return res.json(
        successResponse(services, "Search results retrieved successfully", meta)
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get reviews for a tasker
   */
  async getTaskerReviews(req: Request, res: Response, next: NextFunction) {
    try {
      const taskerId = Number(req.params.taskerId);
      const reviews = await serviceService.getTaskerReviews(taskerId);

      return res.json(
        successResponse(reviews, "Tasker reviews retrieved successfully")
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create a new service
   */
  async createService(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      // Validate request
      const { error, value } = validateService(req.body);
      if (error) {
        throw new AppError(error.details[0].message, 400);
      }

      // Create service
      const service = await serviceService.createService(value);

      return res
        .status(201)
        .json(successResponse(service, "Service created successfully"));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update a service
   */
  async updateService(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);

      // Validate request
      const { error, value } = validateService(req.body, true);
      if (error) {
        throw new AppError(error.details[0].message, 400);
      }

      // Update service
      const service = await serviceService.updateService(id, value);

      if (!service) {
        throw new AppError("Service not found", 404);
      }

      return res.json(successResponse(service, "Service updated successfully"));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete a service
   */
  async deleteService(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);

      const result = await serviceService.deleteService(id);

      if (!result) {
        throw new AppError("Service not found", 404);
      }

      return res
        .status(200)
        .json(
          successResponse({ deleted: true }, "Service deleted successfully")
        );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Toggle service active status
   */
  async toggleServiceActive(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const id = Number(req.params.id);
      const { isActive } = req.body;

      if (isActive === undefined || typeof isActive !== "boolean") {
        throw new AppError("isActive boolean is required", 400);
      }

      const service = await serviceService.toggleServiceActive(id, isActive);

      if (!service) {
        throw new AppError("Service not found", 404);
      }

      return res.json(
        successResponse(
          service,
          `Service ${isActive ? "activated" : "deactivated"} successfully`
        )
      );
    } catch (error) {
      next(error);
    }
  }
}

export const serviceController = new ServiceController();
