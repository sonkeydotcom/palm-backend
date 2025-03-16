import { eq, like, and, desc, asc, sql } from "drizzle-orm";
import slugify from "slugify";
import { categories, Category, NewCategory } from "./service.schema";
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
  ): Promise<Category[]> {
    const {
      includeInactive = false,
      parentId,
      sort = "displayOrder",
      order = "asc",
    } = options;

    let query = db.select().from(categories).$dynamic();

    // Filter by active status
    if (!includeInactive) {
      query = query.where(eq(categories.isActive, true));
    }

    // Filter by parent ID
    if (parentId !== undefined) {
      if (parentId === null) {
        query = query.where(sql`${categories.parentId} IS NULL`);
      } else {
        query = query.where(eq(categories.parentId, parentId));
      }
    }

    // Apply sorting
    if (sort === "name") {
      query =
        order === "asc"
          ? query.orderBy(asc(categories.name))
          : query.orderBy(desc(categories.name));
    } else if (sort === "createdAt") {
      query =
        order === "asc"
          ? query.orderBy(asc(categories.createdAt))
          : query.orderBy(desc(categories.createdAt));
    } else {
      // Default sort by display order
      query =
        order === "asc"
          ? query.orderBy(asc(categories.displayOrder))
          : query.orderBy(desc(categories.displayOrder));
    }

    return query;
  }

  async findById(id: number): Promise<Category | undefined> {
    const result = await db
      .select()
      .from(categories)
      .where(eq(categories.id, id))
      .limit(1);

    return result[0];
  }

  async findBySlug(slug: string): Promise<Category | undefined> {
    const result = await db
      .select()
      .from(categories)
      .where(eq(categories.slug, slug))
      .limit(1);

    return result[0];
  }

  async search(query: string): Promise<Category[]> {
    return db
      .select()
      .from(categories)
      .where(
        and(eq(categories.isActive, true), like(categories.name, `%${query}%`))
      );
  }

  async create(
    data: Omit<NewCategory, "slug"> & { slug?: string }
  ): Promise<Category> {
    // Generate slug if not provided
    const slug = data.slug || slugify(data.name, { lower: true, strict: true });

    // Check if slug already exists
    const existingCategory = await this.findBySlug(slug);
    if (existingCategory) {
      throw new AppError("Category with this slug already exists", 400);
    }

    const result = await db
      .insert(categories)
      .values({
        ...data,
        slug,
      })
      .returning();

    return result[0];
  }

  async update(
    id: number,
    data: Partial<Omit<Category, "id" | "createdAt">>
  ): Promise<Category | undefined> {
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
      .update(categories)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(categories.id, id))
      .returning();

    return result[0];
  }

  async delete(id: number): Promise<boolean> {
    // In a real application, you might want to check if there are tasks using this category
    // and either prevent deletion or update those tasks

    const result = await db
      .delete(categories)
      .where(eq(categories.id, id))
      .returning();

    return result.length > 0;
  }

  async toggleActive(
    id: number,
    isActive: boolean
  ): Promise<Category | undefined> {
    const result = await db
      .update(categories)
      .set({
        isActive,
        updatedAt: new Date(),
      })
      .where(eq(categories.id, id))
      .returning();

    return result[0];
  }
}

export const categoryService = new CategoryService();
