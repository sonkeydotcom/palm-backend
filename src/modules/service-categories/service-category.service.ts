import { eq, like, and, desc, asc, sql } from "drizzle-orm";
import slugify from "slugify";
import {
  NewServiceCategory,
  serviceCategories,
  ServiceCategory,
} from "./service-category.schema";
import db from "../../config/database";
import { AppError } from "../../utils/app-error";

export class CategoryService {
  async findAll(
    options: {
      includeInactive?: boolean;
      parentId?: number | null;
      sort?: string;
      order?: "asc" | "desc";
    } = {}
  ): Promise<ServiceCategory[]> {
    const {
      includeInactive = false,
      parentId,
      sort = "displayOrder",
      order = "asc",
    } = options;

    let query = db.select().from(serviceCategories).$dynamic();

    // Filter by active status
    if (!includeInactive) {
      query = query.where(eq(serviceCategories.isActive, true));
    }

    // Filter by parent ID
    if (parentId !== undefined) {
      if (parentId === null) {
        query = query.where(sql`${serviceCategories.parentId} IS NULL`);
      } else {
        query = query.where(eq(serviceCategories.parentId, parentId));
      }
    }

    // Apply sorting
    if (sort === "name") {
      query =
        order === "asc"
          ? query.orderBy(asc(serviceCategories.name))
          : query.orderBy(desc(serviceCategories.name));
    } else if (sort === "createdAt") {
      query =
        order === "asc"
          ? query.orderBy(asc(serviceCategories.createdAt))
          : query.orderBy(desc(serviceCategories.createdAt));
    } else {
      // Default sort by display order
      query =
        order === "asc"
          ? query.orderBy(asc(serviceCategories.displayOrder))
          : query.orderBy(desc(serviceCategories.displayOrder));
    }

    return query;
  }

  async findById(id: number): Promise<ServiceCategory | undefined> {
    const result = await db
      .select()
      .from(serviceCategories)
      .where(eq(serviceCategories.id, id))
      .limit(1);

    return result[0];
  }

  async findBySlug(slug: string): Promise<ServiceCategory | undefined> {
    const result = await db
      .select()
      .from(serviceCategories)
      .where(eq(serviceCategories.slug, slug))
      .limit(1);

    return result[0];
  }

  async search(query: string): Promise<ServiceCategory[]> {
    return db
      .select()
      .from(serviceCategories)
      .where(
        and(
          eq(serviceCategories.isActive, true),
          like(serviceCategories.name, `%${query}%`)
        )
      );
  }

  async create(
    data: Omit<NewServiceCategory, "slug"> & { slug?: string }
  ): Promise<ServiceCategory> {
    // Generate slug if not provided
    const slug = data.slug || slugify(data.name, { lower: true, strict: true });

    // Check if slug already exists
    const existingCategory = await this.findBySlug(slug);
    if (existingCategory) {
      throw new AppError("Category with this slug already exists", 400);
    }

    const result = await db
      .insert(serviceCategories)
      .values({
        ...data,
        slug,
      })
      .returning();

    return result[0];
  }

  async update(
    id: number,
    data: Partial<Omit<ServiceCategory, "id" | "createdAt">>
  ): Promise<ServiceCategory | undefined> {
    // If slug is being updated, check if it already exists
    if (data.slug) {
      const existingCategory = await this.findBySlug(data.slug);
      if (existingCategory && existingCategory.id !== id) {
        throw new AppError("Category with this slug already exists", 400);
      }
    }

    // If name is being updated but not slug, generate a new slug
    if (data.name && !data.slug) {
      data.slug = slugify(data.name, { lower: true, strict: true });

      // Check if generated slug already exists
      const existingCategory = await this.findBySlug(data.slug);
      if (existingCategory && existingCategory.id !== id) {
        // Append ID to make slug unique
        data.slug = `${data.slug}-${id}`;
      }
    }

    const result = await db
      .update(serviceCategories)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(serviceCategories.id, id))
      .returning();

    return result[0];
  }

  async delete(id: number): Promise<boolean> {
    // In a real application, you might want to check if there are services using this category
    // and either prevent deletion or update those services

    const result = await db
      .delete(serviceCategories)
      .where(eq(serviceCategories.id, id))
      .returning();

    return result.length > 0;
  }

  async toggleActive(
    id: number,
    isActive: boolean
  ): Promise<ServiceCategory | undefined> {
    const result = await db
      .update(serviceCategories)
      .set({
        isActive,
        updatedAt: new Date(),
      })
      .where(eq(serviceCategories.id, id))
      .returning();

    return result[0];
  }
}

export const categoryService = new CategoryService();
