import {
  eq,
  like,
  and,
  or,
  desc,
  asc,
  inArray,
  sql,
  between,
} from "drizzle-orm";
import {
  NewTasker,
  NewTaskerPortfolioItem,
  NewTaskerSkill,
  Tasker,
  taskerPortfolio,
  TaskerPortfolioItem,
  taskers,
  TaskerSkill,
  taskerSkills,
} from "./tasker.schema";
import db from "../../config/database";
import { categories } from "../categories/category.schema";
import { AppError } from "../../utils/app-error";
import { User } from "../users/user.schema";

export interface TaskerSearchParams {
  query?: string;
  categoryId?: number;
  categorySlug?: string;
  locationId?: number;
  minRate?: number;
  maxRate?: number;
  minRating?: number;
  isElite?: boolean;
  isBackgroundChecked?: boolean;
  isIdentityVerified?: boolean;
  sort?: "rating" | "completions" | "rate" | "responseTime";
  order?: "asc" | "desc";
  page?: number;
  limit?: number;
  includeInactive?: boolean;
}

export interface TaskerWithRelations extends Tasker {
  skills?: (TaskerSkill & {
    categoryName?: string;
    categorySlug?: string;
  })[];
  portfolioItems?: TaskerPortfolioItem[];
  user?: User;
}

export class TaskerService {
  // Update the findAll method to follow current Drizzle best practices
  async findAll(
    options: TaskerSearchParams = {}
  ): Promise<TaskerWithRelations[]> {
    const {
      includeInactive = false,
      sort = "rating",
      order = "desc",
      page = 1,
      limit = 20,
    } = options;

    const offset = (page - 1) * limit;
    const taskerConditions = [];

    if (!includeInactive) {
      taskerConditions.push(eq(taskers.isActive, true));
    }

    if (options.query) {
      taskerConditions.push(
        or(
          like(taskers.headline, `%${options.query}%`),
          like(taskers.bio, `%${options.query}%`)
        )
      );
    }

    if (options.locationId) {
      taskerConditions.push(eq(taskers.locationId, options.locationId));
    }

    if (options.minRating !== undefined) {
      taskerConditions.push(
        sql`${taskers.averageRating} >= ${options.minRating}`
      );
    }

    if (options.isElite !== undefined) {
      taskerConditions.push(eq(taskers.isElite, options.isElite));
    }

    if (options.isBackgroundChecked !== undefined) {
      taskerConditions.push(
        eq(taskers.backgroundChecked, options.isBackgroundChecked)
      );
    }

    if (options.isIdentityVerified !== undefined) {
      taskerConditions.push(
        eq(taskers.identityVerified, options.isIdentityVerified)
      );
    }

    // Sorting logic
    const sortFieldMap = {
      rating: taskers.averageRating,
      completions: taskers.totalTasksCompleted,
      responseTime: taskers.responseTime,
      rate: taskerSkills.hourlyRate, // Add this line to include "rate"
    } as const;

    const orderByClause =
      order === "asc" ? asc(sortFieldMap[sort]) : desc(sortFieldMap[sort]);

    // Build the base query
    let taskerIdsQuery = db
      .select({ id: taskers.id })
      .from(taskers)
      .$dynamic()
      .limit(limit)
      .offset(offset)
      .orderBy(orderByClause);

    // Apply skill and rate filters
    if (
      options.categoryId ||
      options.categorySlug ||
      options.minRate !== undefined ||
      options.maxRate !== undefined
    ) {
      const skillConditions = [];

      if (options.categoryId) {
        skillConditions.push(eq(taskerSkills.categoryId, options.categoryId));
      }

      if (options.categorySlug) {
        skillConditions.push(eq(categories.slug, options.categorySlug));
      }

      if (options.minRate !== undefined || options.maxRate !== undefined) {
        const minRate = options.minRate ?? 0;
        const maxRate = options.maxRate ?? Number.MAX_SAFE_INTEGER;
        skillConditions.push(
          between(taskerSkills.hourlyRate, minRate, maxRate)
        );
      }

      taskerIdsQuery = taskerIdsQuery
        .innerJoin(taskerSkills, eq(taskerSkills.taskerId, taskers.id))
        .innerJoin(categories, eq(taskerSkills.categoryId, categories.id))
        .where(and(...skillConditions));
    }

    // Add other conditions to the tasker query
    if (taskerConditions.length > 0) {
      taskerIdsQuery = taskerIdsQuery.where(and(...taskerConditions));
    }

    // Execute the query
    const taskerIdsResult = await taskerIdsQuery;
    const filteredTaskerIds = taskerIdsResult.map((t) => t.id);

    if (filteredTaskerIds.length === 0) {
      return [];
    }

    // Fetch the full tasker data
    const taskersResult = await db
      .select()
      .from(taskers)
      .where(inArray(taskers.id, filteredTaskerIds));

    // Create a map for quick lookup
    const taskersById = new Map<number, TaskerWithRelations>();
    taskersResult.forEach((tasker) => {
      taskersById.set(tasker.id, { ...tasker, skills: [], portfolioItems: [] });
    });

    // Fetch skills for these taskers
    const skillsResult = await db
      .select()
      .from(taskerSkills)
      .leftJoin(categories, eq(taskerSkills.categoryId, categories.id))
      .where(
        and(
          inArray(taskerSkills.taskerId, filteredTaskerIds),
          eq(taskerSkills.isActive, true)
        )
      );

    skillsResult.forEach((row) => {
      const tasker = taskersById.get(row.tasker_skills.taskerId);
      if (tasker) {
        const skill = row.tasker_skills;
        const category = row.categories;
        tasker.skills!.push({
          ...skill,
          categoryName: category?.name,
          categorySlug: category?.slug,
        });
      }
    });

    // Fetch portfolio items for these taskers
    const portfolioItems = await db
      .select()
      .from(taskerPortfolio)
      .where(inArray(taskerPortfolio.taskerId, filteredTaskerIds))
      .orderBy(asc(taskerPortfolio.displayOrder));

    portfolioItems.forEach((item) => {
      const tasker = taskersById.get(item.taskerId);
      if (tasker) {
        tasker.portfolioItems!.push(item);
      }
    });

    // Convert map back to array
    return filteredTaskerIds.map((id) => taskersById.get(id)!);
  }

  async findById(id: number): Promise<TaskerWithRelations | undefined> {
    const result = await db
      .select()
      .from(taskers)
      .where(eq(taskers.id, id))
      .limit(1);

    if (result.length === 0) {
      return undefined;
    }

    const tasker: TaskerWithRelations = result[0];

    // Fetch skills
    // Fetch skills
    const skills = await db
      .select({
        id: taskerSkills.id,
        isActive: taskerSkills.isActive,
        createdAt: taskerSkills.createdAt,
        updatedAt: taskerSkills.updatedAt,
        taskerId: taskerSkills.taskerId,
        categoryId: taskerSkills.categoryId,
        hourlyRate: taskerSkills.hourlyRate,
        quickPitch: taskerSkills.quickPitch,
        experience: taskerSkills.experience,
        experienceYears: taskerSkills.experienceYears,
        hasEquipment: taskerSkills.hasEquipment,
        equipmentDescription: taskerSkills.equipmentDescription,
        isQuickAssign: taskerSkills.isQuickAssign,
        categoryName: categories.name, // Use the correct join table here
        categorySlug: categories.slug, // Use the correct join table here
      })
      .from(taskerSkills)
      .leftJoin(categories, eq(taskerSkills.categoryId, categories.id)) // Fixed join table
      .where(
        and(eq(taskerSkills.taskerId, id), eq(taskerSkills.isActive, true))
      );

    tasker.skills = skills.map((skill) => {
      const { categoryName, categorySlug, ...skillData } = skill;
      return {
        ...skillData,
        categoryName: categoryName ?? undefined,
        categorySlug: categorySlug ?? undefined,
      };
    });

    // Fetch portfolio items
    const portfolioItems = await db
      .select()
      .from(taskerPortfolio)
      .where(eq(taskerPortfolio.taskerId, id))
      .orderBy(asc(taskerPortfolio.displayOrder));

    tasker.portfolioItems = portfolioItems;

    return tasker;
  }

  async findByUserId(userId: number): Promise<TaskerWithRelations | undefined> {
    const result = await db
      .select()
      .from(taskers)
      .where(eq(taskers.userId, userId))
      .limit(1);

    if (result.length === 0) {
      return undefined;
    }

    return this.findById(result[0].id);
  }

  async create(taskerData: NewTasker): Promise<TaskerWithRelations> {
    // Check if user already has a tasker profile
    const existingTasker = await db
      .select()
      .from(taskers)
      .where(eq(taskers.userId, taskerData.userId))
      .limit(1);

    if (existingTasker.length > 0) {
      throw new AppError("User already has a tasker profile", 400);
    }

    const result = await db.insert(taskers).values(taskerData).returning();

    return this.findById(result[0].id) as Promise<TaskerWithRelations>;
  }

  async update(
    id: number,
    data: Partial<Omit<Tasker, "id" | "userId" | "createdAt">>
  ): Promise<TaskerWithRelations | undefined> {
    const result = await db
      .update(taskers)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(taskers.id, id))
      .returning();

    if (result.length === 0) {
      return undefined;
    }

    return this.findById(id);
  }

  async addSkill(
    taskerId: number,
    skillData: Omit<NewTaskerSkill, "taskerId" | "createdAt" | "updatedAt">
  ): Promise<TaskerSkill> {
    // Check if tasker already has this skill
    const existingSkill = await db
      .select()
      .from(taskerSkills)
      .where(
        and(
          eq(taskerSkills.taskerId, taskerId),
          eq(taskerSkills.categoryId, skillData.categoryId)
        )
      )
      .limit(1);

    if (existingSkill.length > 0) {
      // If skill exists but is inactive, reactivate it
      if (!existingSkill[0].isActive) {
        const result = await db
          .update(taskerSkills)
          .set({
            hourlyRate: skillData.hourlyRate,
            quickPitch: skillData.quickPitch,
            experience: skillData.experience,
            experienceYears: skillData.experienceYears,
            hasEquipment: skillData.hasEquipment,
            equipmentDescription: skillData.equipmentDescription,
            isQuickAssign: skillData.isQuickAssign,
            isActive: true,
            updatedAt: new Date(),
          })
          .where(eq(taskerSkills.id, existingSkill[0].id))
          .returning();

        return result[0];
      }

      throw new AppError("Tasker already has this skill", 400);
    }

    const result = await db
      .insert(taskerSkills)
      .values({
        taskerId,
        ...skillData,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return result[0];
  }

  async updateSkill(
    taskerId: number,
    skillId: number,
    data: Partial<
      Omit<TaskerSkill, "id" | "taskerId" | "categoryId" | "createdAt">
    >
  ): Promise<TaskerSkill | undefined> {
    const result = await db
      .update(taskerSkills)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(
        and(eq(taskerSkills.id, skillId), eq(taskerSkills.taskerId, taskerId))
      )
      .returning();

    return result[0];
  }

  async removeSkill(taskerId: number, skillId: number): Promise<boolean> {
    // Soft delete by setting isActive to false
    const result = await db
      .update(taskerSkills)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(
        and(eq(taskerSkills.id, skillId), eq(taskerSkills.taskerId, taskerId))
      )
      .returning();

    return result.length > 0;
  }

  async addPortfolioItem(
    taskerId: number,
    itemData: Omit<
      NewTaskerPortfolioItem,
      "taskerId" | "createdAt" | "updatedAt"
    >
  ): Promise<TaskerPortfolioItem> {
    // Get the highest display order
    const maxOrderResult = await db
      .select({ maxOrder: sql`MAX(${taskerPortfolio.displayOrder})` })
      .from(taskerPortfolio)
      .where(eq(taskerPortfolio.taskerId, taskerId));

    const displayOrder = (Number(maxOrderResult[0]?.maxOrder) || 0) + 1;

    const result = await db
      .insert(taskerPortfolio)
      .values({
        taskerId,
        ...itemData,
        displayOrder: itemData.displayOrder || displayOrder,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return result[0];
  }

  async updatePortfolioItem(
    taskerId: number,
    itemId: number,
    data: Partial<Omit<TaskerPortfolioItem, "id" | "taskerId" | "createdAt">>
  ): Promise<TaskerPortfolioItem | undefined> {
    const result = await db
      .update(taskerPortfolio)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(taskerPortfolio.id, itemId),
          eq(taskerPortfolio.taskerId, taskerId)
        )
      )
      .returning();

    return result[0];
  }

  async removePortfolioItem(
    taskerId: number,
    itemId: number
  ): Promise<boolean> {
    const result = await db
      .delete(taskerPortfolio)
      .where(
        and(
          eq(taskerPortfolio.id, itemId),
          eq(taskerPortfolio.taskerId, taskerId)
        )
      )
      .returning();

    return result.length > 0;
  }

  async updateRating(id: number, rating: number): Promise<Tasker | undefined> {
    const tasker = await this.findById(id);

    if (!tasker) {
      return undefined;
    }

    const totalReviews = (tasker.totalReviews || 0) + 1;
    const currentRating = tasker.averageRating || 0;

    // Calculate new average rating
    const newRating =
      (currentRating * (totalReviews - 1) + rating) / totalReviews;

    const result = await db
      .update(taskers)
      .set({
        averageRating: newRating,
        totalReviews,
        updatedAt: new Date(),
      })
      .where(eq(taskers.id, id))
      .returning();

    return result[0];
  }

  async incrementTasksCompleted(id: number): Promise<Tasker | undefined> {
    const result = await db
      .update(taskers)
      .set({
        totalTasksCompleted: sql`${taskers.totalTasksCompleted} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(taskers.id, id))
      .returning();

    return result[0];
  }

  async getTopTaskers(limit = 6): Promise<TaskerWithRelations[]> {
    return this.findAll({
      isElite: true,
      sort: "rating",
      order: "desc",
      limit,
    });
  }

  async getTaskersByCategory(
    categoryId: number,
    limit = 10
  ): Promise<TaskerWithRelations[]> {
    return this.findAll({
      categoryId,
      sort: "rating",
      order: "desc",
      limit,
    });
  }
}

export const taskerService = new TaskerService();
