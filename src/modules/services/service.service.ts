import { eq, like, and, desc, asc, sql } from "drizzle-orm";
import slugify from "slugify";
import db from "../../config/database";
import { AppError } from "../../utils/app-error";
import { NewService, Service, services } from "./service.schema";

export class ServiceService {
  async findAll(
    options: {
      includeInactive?: boolean;
      parentId?: number | null;
      sort?: string;
      order?: "asc" | "desc";
    } = {}
  ): Promise<Service[]> {
    const {
      includeInactive = false,
      parentId,
      sort = "displayOrder",
      order = "asc",
    } = options;

    let query = db.select().from(services).$dynamic();

    // Filter by active status
    if (!includeInactive) {
      query = query.where(eq(services.isActive, true));
    }

    // Filter by parent ID
    if (parentId !== undefined) {
      if (parentId === null) {
        query = query.where(sql`${services.parentId} IS NULL`);
      } else {
        query = query.where(eq(services.parentId, parentId));
      }
    }

    // Apply sorting
    if (sort === "name") {
      query =
        order === "asc"
          ? query.orderBy(asc(services.name))
          : query.orderBy(desc(services.name));
    } else if (sort === "createdAt") {
      query =
        order === "asc"
          ? query.orderBy(asc(services.createdAt))
          : query.orderBy(desc(services.createdAt));
    } else {
      // Default sort by display order
      query =
        order === "asc"
          ? query.orderBy(asc(services.displayOrder))
          : query.orderBy(desc(services.displayOrder));
    }

    return query;
  }

  async findById(id: number): Promise<Service | undefined> {
    const result = await db
      .select()
      .from(services)
      .where(eq(services.id, id))
      .limit(1);

    return result[0];
  }

  async findBySlug(slug: string): Promise<Service | undefined> {
    const result = await db
      .select()
      .from(services)
      .where(eq(services.slug, slug))
      .limit(1);

    return result[0];
  }

  async search(query: string): Promise<Service[]> {
    return db
      .select()
      .from(services)
      .where(
        and(eq(services.isActive, true), like(services.name, `%${query}%`))
      );
  }

  async create(
    data: Omit<NewService, "slug"> & { slug?: string }
  ): Promise<Service> {
    // Generate slug if not provided
    const slug = data.slug || slugify(data.name, { lower: true, strict: true });

    // Check if slug already exists
    const existingService = await this.findBySlug(slug);
    if (existingService) {
      throw new AppError("Service with this slug already exists", 400);
    }

    const result = await db
      .insert(services)
      .values({
        ...data,
        slug,
      })
      .returning();

    return result[0];
  }

  async update(
    id: number,
    data: Partial<Omit<Service, "id" | "createdAt">>
  ): Promise<Service | undefined> {
    // If slug is being updated, check if it already exists
    if (data.slug) {
      const existingService = await this.findBySlug(data.slug);
      if (existingService && existingService.id !== id) {
        throw new AppError("Service with this slug already exists", 400);
      }
    }

    // If name is being updated but not slug, generate a new slug
    if (data.name && !data.slug) {
      data.slug = slugify(data.name, { lower: true, strict: true });

      // Check if generated slug already exists
      const existingService = await this.findBySlug(data.slug);
      if (existingService && existingService.id !== id) {
        // Append ID to make slug unique
        data.slug = `${data.slug}-${id}`;
      }
    }

    const result = await db
      .update(services)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(services.id, id))
      .returning();

    return result[0];
  }

  async delete(id: number): Promise<boolean> {
    // In a real application, you might want to check if there are tasks using this service
    // and either prevent deletion or update those tasks

    const result = await db
      .delete(services)
      .where(eq(services.id, id))
      .returning();

    return result.length > 0;
  }

  async toggleActive(
    id: number,
    isActive: boolean
  ): Promise<Service | undefined> {
    const result = await db
      .update(services)
      .set({
        isActive,
        updatedAt: new Date(),
      })
      .where(eq(services.id, id))
      .returning();

    return result[0];
  }
}

export const serviceService = new ServiceService();
