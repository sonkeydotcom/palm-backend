import type { Request, Response, NextFunction } from "express";
import { categoryService } from "./category.service";
import { AuthRequest } from "../../middleware/auth.middleware";
import { validateTaskCategory } from "../../validators/task-validator";
import { success } from "../../utils/api-response";
import { AppError } from "../../utils/app-error";

export class CategoryController {
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

      return res.json(categories);
    } catch (error) {
      next(error);
    }
  }

  async getCategoryById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number.parseInt(req.params.id);
      const category = await categoryService.findById(id);

      if (!category) {
        return res.status(404).json({ error: "Category not found" });
      }

      return res.json(category);
    } catch (error) {
      next(error);
    }
  }

  async getCategoryBySlug(req: Request, res: Response, next: NextFunction) {
    try {
      const { slug } = req.params;
      const category = await categoryService.findBySlug(slug);

      if (!category) {
        return res.status(404).json({ error: "Category not found" });
      }

      return res.json(category);
    } catch (error) {
      next(error);
    }
  }

  async searchCategories(req: Request, res: Response, next: NextFunction) {
    try {
      const { query } = req.query;

      if (!query || typeof query !== "string") {
        return res.status(400).json({ error: "Search query is required" });
      }

      const categories = await categoryService.search(query);
      return res.json(categories);
    } catch (error) {
      next(error);
    }
  }

  async createCategory(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      // Validate request
      const { error, value } = validateTaskCategory(req.body);
      if (error) {
        throw new AppError(error.details[0].message, 400);
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
      const { error, value } = validateTaskCategory(req.body, true);
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }

      // Update category
      const category = await categoryService.update(id, value);

      if (!category) {
        return res.status(404).json({ error: "Category not found" });
      }

      return res.json(category);
    } catch (error) {
      next(error);
    }
  }

  async deleteCategory(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = Number.parseInt(req.params.id);

      const result = await categoryService.delete(id);

      if (!result) {
        return res.status(404).json({ error: "Category not found" });
      }

      return res.status(204).send();
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
        return res.status(400).json({ error: "isActive boolean is required" });
      }

      const category = await categoryService.toggleActive(id, isActive);

      if (!category) {
        return res.status(404).json({ error: "Category not found" });
      }

      return res.json(category);
    } catch (error) {
      next(error);
    }
  }
}

export const categoryController = new CategoryController();
