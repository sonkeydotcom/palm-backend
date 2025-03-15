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
import { User, users } from "../users/user.schema";

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

    // Step 1: Build the base query for taskers with all direct filters
    let taskerQuery = db.select().from(taskers).$dynamic();

    // Apply filters directly on taskers table
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

    if (taskerConditions.length > 0) {
      taskerQuery = taskerQuery.where(and(...taskerConditions));
    }

    // Step 2: Handle category and rate filters (requires join with taskerSkills)
    let taskerIds: number[] = [];

    if (
      options.categoryId ||
      options.categorySlug ||
      options.minRate !== undefined ||
      options.maxRate !== undefined
    ) {
      let skillsQuery = db
        .select({ taskerId: taskerSkills.taskerId })
        .from(taskerSkills)
        .where(eq(taskerSkills.isActive, true));

      const skillConditions = [];

      if (options.categoryId) {
        skillConditions.push(eq(taskerSkills.categoryId, options.categoryId));
      }

      if (options.categorySlug) {
        // For category slug, we need to find the category ID first
        const categoryQuery = await db
          .select({ id: categories.id })
          .from(categories)
          .where(eq(categories.slug, options.categorySlug))
          .limit(1);

        if (categoryQuery.length > 0) {
          skillConditions.push(
            eq(taskerSkills.categoryId, categoryQuery[0].id)
          );
        } else {
          return []; // No category found with this slug
        }
      }

      if (options.minRate !== undefined && options.maxRate !== undefined) {
        skillConditions.push(
          between(taskerSkills.hourlyRate, options.minRate, options.maxRate)
        );
      } else if (options.minRate !== undefined) {
        skillConditions.push(
          sql`${taskerSkills.hourlyRate} >= ${options.minRate}`
        );
      } else if (options.maxRate !== undefined) {
        skillConditions.push(
          sql`${taskerSkills.hourlyRate} <= ${options.maxRate}`
        );
      }

      if (skillConditions.length > 0) {
        skillsQuery = skillsQuery.where(and(...skillConditions));
      }

      // Get tasker IDs that have matching skills
      const taskerIdsWithSkills = await skillsQuery;
      taskerIds = taskerIdsWithSkills.map((t) => t.taskerId);

      if (taskerIds.length === 0) {
        return []; // No taskers match the skill criteria
      }

      // Add condition to filter by these tasker IDs
      taskerQuery = taskerQuery.where(inArray(taskers.id, taskerIds));
    }

    // Step 3: Apply sorting based on the selected field
    switch (sort) {
      case "rating":
        taskerQuery =
          order === "asc"
            ? taskerQuery.orderBy(asc(taskers.averageRating))
            : taskerQuery.orderBy(desc(taskers.averageRating));
        break;
      case "completions":
        taskerQuery =
          order === "asc"
            ? taskerQuery.orderBy(asc(taskers.totalTasksCompleted))
            : taskerQuery.orderBy(desc(taskers.totalTasksCompleted));
        break;
      case "responseTime":
        taskerQuery =
          order === "asc"
            ? taskerQuery.orderBy(asc(taskers.responseTime))
            : taskerQuery.orderBy(desc(taskers.responseTime));
        break;
      case "createdAt":
        taskerQuery =
          order === "asc"
            ? taskerQuery.orderBy(asc(taskers.createdAt))
            : taskerQuery.orderBy(desc(taskers.createdAt));
        break;
      // For "rate" sorting, we can't directly sort here as it's in the skills table
      // We'll handle it after fetching the results
    }

    // Step 4: Apply pagination
    const offset = (page - 1) * limit;
    taskerQuery = taskerQuery.limit(limit).offset(offset);

    // Step 5: Execute the tasker query
    const taskersResult = await taskerQuery;

    if (taskersResult.length === 0) {
      return []; // No taskers match the criteria
    }

    // Get the filtered tasker IDs for related data
    const filteredTaskerIds = taskersResult.map((tasker) => tasker.id);

    // Create a map for the taskers
    const taskersById = new Map<number, TaskerWithRelations>();
    taskersResult.forEach((tasker) => {
      taskersById.set(tasker.id, { ...tasker, skills: [], portfolioItems: [] });
    });

    // Step 6: Fetch skills with category information
    const skillsResult = await db
      .select({
        taskerSkill: taskerSkills,
        categoryName: categories.name,
        categorySlug: categories.slug,
      })
      .from(taskerSkills)
      .leftJoin(categories, eq(taskerSkills.categoryId, categories.id))
      .where(
        and(
          inArray(taskerSkills.taskerId, filteredTaskerIds),
          eq(taskerSkills.isActive, true)
        )
      );

    // Add skills to taskers
    skillsResult.forEach((row) => {
      const tasker = taskersById.get(row.taskerSkill.taskerId);
      if (tasker && tasker.skills) {
        tasker.skills.push({
          ...row.taskerSkill,
          categoryName: row.categoryName,
          categorySlug: row.categorySlug,
        });
      }
    });

    // Step 7: Fetch portfolio items
    const portfolioItems = await db
      .select()
      .from(taskerPortfolio)
      .where(inArray(taskerPortfolio.taskerId, filteredTaskerIds))
      .orderBy(asc(taskerPortfolio.displayOrder));

    // Add portfolio items to taskers
    portfolioItems.forEach((item) => {
      const tasker = taskersById.get(item.taskerId);
      if (tasker && tasker.portfolioItems) {
        tasker.portfolioItems.push(item);
      }
    });

    // Step 8: Fetch user data if needed
    const userIds = taskersResult.map((tasker) => tasker.userId);
    const usersResult = await db
      .select()
      .from(users)
      .where(inArray(users.id, userIds));

    // Create user map for quick lookup
    const usersById = new Map<number, User>();
    usersResult.forEach((user) => {
      usersById.set(user.id, user);
    });

    // Add user data to taskers
    taskersResult.forEach((tasker) => {
      const taskerWithRelations = taskersById.get(tasker.id);
      if (taskerWithRelations) {
        taskerWithRelations.user = usersById.get(tasker.userId);
      }
    });

    // Special case: If sorting by rate, we need to post-process the results
    if (sort === "rate") {
      const taskersArray = Array.from(taskersById.values());

      // Sort by the lowest or highest hourly rate across all skills
      return taskersArray.sort((a, b) => {
        const aRates = a.skills?.map((skill) => skill.hourlyRate) || [];
        const bRates = b.skills?.map((skill) => skill.hourlyRate) || [];

        const aMinRate = aRates.length > 0 ? Math.min(...aRates) : Infinity;
        const bMinRate = bRates.length > 0 ? Math.min(...bRates) : Infinity;

        return order === "asc" ? aMinRate - bMinRate : bMinRate - aMinRate;
      });
    }

    // Convert map back to array, preserving the original query order
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
    const skills = await db
      .select({
        ...taskerSkills,
        categoryName: taskCategories.name,
        categorySlug: taskCategories.slug,
      })
      .from(taskerSkills)
      .leftJoin(categories, eq(taskerSkills.categoryId, categories.id))
      .where(
        and(eq(taskerSkills.taskerId, id), eq(taskerSkills.isActive, true))
      );

    tasker.skills = skills.map((skill) => {
      const { categoryName, categorySlug, ...skillData } = skill;
      return {
        ...skillData,
        categoryName,
        categorySlug,
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

    const displayOrder = (maxOrderResult[0]?.maxOrder || 0) + 1;

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
