import type { Request, Response, NextFunction } from "express";
import { AuthRequest } from "../../middleware/auth.middleware";
import { categoryService } from "./service-category.service";
import { validateServiceCategory } from "../services/service-validator";
import { success } from "../../utils/api-response";

export class ServiceCategoryController {
  async getAllCategories(req: Request, res: Response, next: NextFunction) {
    try {
      const { includeInactive, parentId, sort, order } = req.query;

      const categories = await categoryService.findAll({
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

      success(res, categories, "Categories retrieved successfully", 200, {
        totalCount: categories.length,
      });
    } catch (error) {
      next(error);
    }
  }

  async getCategoryById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number.parseInt(req.params.id);
      const category = await categoryService.findById(id);

      if (!category) {
        res.status(404).json({ error: "Category not found" });
        return;
      }

      success(res, category, "Category retrieved successfully", 200, {
        totalCount: 1,
      });
    } catch (error) {
      next(error);
    }
  }

  async getCategoryBySlug(req: Request, res: Response, next: NextFunction) {
    try {
      const { slug } = req.params;
      const category = await categoryService.findBySlug(slug);

      if (!category) {
        res.status(404).json({ error: "Category not found" });
        return;
      }

      success(res, category, "Category retrieved successfully", 200, {
        totalCount: 1,
      });
    } catch (error) {
      next(error);
    }
  }

  async searchCategories(req: Request, res: Response, next: NextFunction) {
    try {
      const { query } = req.query;

      if (!query || typeof query !== "string") {
        res.status(400).json({ error: "Search query is required" });
        return;
      }

      const categories = await categoryService.search(query);

      success(res, categories, "Search results", 200, {
        totalCount: categories.length,
      });
    } catch (error) {
      next(error);
    }
  }

  async createCategory(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      // Validate request
      const { error, value } = validateServiceCategory(req.body);
      if (error) {
        res.status(400).json({ error: error.details[0].message });
        return;
      }

      // Create category
      const category = await categoryService.create(value);

      success(res, category, "Category created successfully", 201);
    } catch (error) {
      next(error);
    }
  }

  async updateCategory(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = Number.parseInt(req.params.id);

      // Validate request
      const { error, value } = validateServiceCategory(req.body, true);
      if (error) {
        res.status(400).json({ error: error.details[0].message });
        return;
      }

      // Update category
      const category = await categoryService.update(id, value);

      if (!category) {
        res.status(404).json({ error: "Category not found" });
        return;
      }

      success(res, category, "Category updated successfully", 200);

      //  {
      //       meta: {
      //         total: 1,
      //         page: 1,
      //         pageSize: 1,
      //       },
      //     }
    } catch (error) {
      next(error);
    }
  }

  async deleteCategory(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = Number.parseInt(req.params.id);

      const result = await categoryService.delete(id);

      if (!result) {
        res.status(404).json({ error: "Category not found" });
        return;
      }

      success(res, {}, "Category deleted successfully", 204);
    } catch (error) {
      next(error);
    }
  }

  async toggleCategoryActive(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const id = Number.parseInt(req.params.id);
      const { isActive } = req.body;

      if (isActive === undefined || typeof isActive !== "boolean") {
        res.status(400).json({ error: "isActive boolean is required" });
        return;
      }

      const category = await categoryService.toggleActive(id, isActive);

      if (!category) {
        res.status(404).json({ error: "Category not found" });
        return;
      }

      success(
        res,
        category,
        `Category ${category.name} has been ${isActive ? "activated" : "deactivated"} successfully.`
      );
    } catch (error) {
      next(error);
    }
  }
}

export const serviceCategoryController = new ServiceCategoryController();
