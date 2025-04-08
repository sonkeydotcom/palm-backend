import express from "express";
import { serviceCategoryController } from "./service-category.controller";

const router = express.Router();

router.get("/", serviceCategoryController.getAllCategories);
router.get("/:id", serviceCategoryController.getCategoryById);
router.get("/slug/:slug", serviceCategoryController.getCategoryBySlug);
router.get("/search", serviceCategoryController.searchCategories);
router.post("/", serviceCategoryController.createCategory);
router.put("/:id", serviceCategoryController.updateCategory);
router.delete("/:id", serviceCategoryController.deleteCategory);
router.patch("/:id", serviceCategoryController.toggleCategoryActive);

export default router;
