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
  NewTask,
  NewTaskFaq,
  NewTaskQuestion,
  Task,
  TaskFaq,
  taskFaqs,
  TaskQuestion,
  taskQuestions,
  tasks,
} from "./task.schema";
import db from "../../config/database";
import { categories } from "../categories/category.schema";
import slugify from "slugify";
import { AppError } from "../../utils/app-error";
import { locations } from "../locations/location.schema";

export interface TaskSearchParams {
  query?: string;
  categoryId?: number;
  categorySlug?: string;
  minRate?: number;
  maxRate?: number;
  tags?: string[];
  isFeatured?: boolean;
  isPopular?: boolean;
  locationId?: number;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  radius?: number;
  latitude?: number;
  longitude?: number;
  sort?: "name" | "rate" | "rating" | "createdAt" | "distance";
  order?: "asc" | "desc";
  page?: number;
  limit?: number;
  includeInactive?: boolean;
}

export interface TaskWithRelations extends Task {
  category?: {
    id: number;
    name: string;
    slug: string;
  };
  questions?: TaskQuestion[];
  faqs?: TaskFaq[];
  location?: {
    id: number;
    address: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
    latitude: number;
    longitude: number;
  };
}

export class TaskService {
  // Fix the findAll method
  // Fix the findAll method
  async findAll(options: TaskSearchParams = {}): Promise<TaskWithRelations[]> {
    const {
      includeInactive = false,
      sort = "createdAt",
      order = "desc",
      page = 1,
      limit = 20,
    } = options;

    // Build all conditions in a single array
    const conditions = [];

    if (!includeInactive) {
      conditions.push(eq(tasks.isActive, true));
    }

    if (options.query) {
      conditions.push(
        or(
          like(tasks.name, `%${options.query}%`),
          like(tasks.description, `%${options.query}%`),
          like(tasks.shortDescription, `%${options.query}%`)
        )
      );
    }

    if (options.categoryId) {
      conditions.push(eq(tasks.categoryId, options.categoryId));
    }

    if (options.categorySlug) {
      conditions.push(eq(categories.slug, options.categorySlug));
    }

    if (options.minRate !== undefined && options.maxRate !== undefined) {
      conditions.push(
        between(tasks.baseHourlyRate, options.minRate, options.maxRate)
      );
    } else if (options.minRate !== undefined) {
      conditions.push(sql`${tasks.baseHourlyRate} >= ${options.minRate}`);
    } else if (options.maxRate !== undefined) {
      conditions.push(sql`${tasks.baseHourlyRate} <= ${options.maxRate}`);
    }

    if (options.tags && options.tags.length > 0) {
      conditions.push(sql`${tasks.tags} ?& array[${options.tags.join(",")}]`);
    }

    if (options.isFeatured !== undefined) {
      conditions.push(eq(tasks.isFeatured, options.isFeatured));
    }

    if (options.isPopular !== undefined) {
      conditions.push(eq(tasks.isPopular, options.isPopular));
    }

    // Location based sorting

    // Determine sort column and direction
    let sortColumn;
    const sortDirection = order === "asc" ? asc : desc;

    switch (sort) {
      case "name":
        sortColumn = tasks.name;
        break;
      case "rate":
        sortColumn = tasks.baseHourlyRate;
        break;
      case "rating":
        sortColumn = tasks.averageRating;
        break;
      default:
        sortColumn = tasks.createdAt;
    }

    // Execute query with all conditions combined
    const results = await db
      .select()
      .from(tasks)
      .leftJoin(categories, eq(tasks.categoryId, categories.id))
      .leftJoin(locations, eq(tasks.locationId, locations.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(sortDirection(sortColumn))
      .limit(limit)
      .offset((page - 1) * limit);

    if (options.locationId) {
      conditions.push(eq(tasks.locationId, options.locationId));
    }

    if (options.city) {
      conditions.push(like(locations.city, `%${options.city}%`));
    }

    if (options.state) {
      conditions.push(like(locations.state, `%${options.state}%`));
    }

    // Add distance-based sortiting  if coordinates and radius are provided

    if (
      options.latitude !== undefined &&
      options.longitude !== undefined &&
      options.radius !== undefined
    ) {
      // calculate distance using Haversine formula
      // Provided 6371 is Earths radius in kilometres

      conditions.push(
        sql`(6371 * acos(cos(radians(${options.latitude})) * cos(radians(${locations.latitude})) * cos(radians(${locations.longitude})- radians(${options.latitude})) + sin(radians(${options.latitude})) * sin(radians(${locations.latitude})))) <= ${options.radius}`
      );
    }

    // Transform results to include category info
    const tasksWithRelations: TaskWithRelations[] = [];

    for (const row of results) {
      const task = row.tasks;
      const category = row.categories
        ? {
            id: row.categories.id,
            name: row.categories.name,
            slug: row.categories.slug,
          }
        : undefined;

      tasksWithRelations.push({
        ...task,
        category,
      });
    }

    // Fetch questions and FAQs for each task
    const taskIds = tasksWithRelations.map((task) => task.id);

    if (taskIds.length > 0) {
      // Fetch questions
      const questions = await db
        .select()
        .from(taskQuestions)
        .where(inArray(taskQuestions.taskId, taskIds))
        .orderBy(asc(taskQuestions.displayOrder));

      // Fetch FAQs
      const faqs = await db
        .select()
        .from(taskFaqs)
        .where(inArray(taskFaqs.taskId, taskIds))
        .orderBy(asc(taskFaqs.displayOrder));

      // Group questions and FAQs by task ID
      const questionsByTaskId: Record<number, TaskQuestion[]> = {};
      const faqsByTaskId: Record<number, TaskFaq[]> = {};

      questions.forEach((question) => {
        if (!questionsByTaskId[question.taskId]) {
          questionsByTaskId[question.taskId] = [];
        }
        questionsByTaskId[question.taskId].push(question);
      });

      faqs.forEach((faq) => {
        if (!faqsByTaskId[faq.taskId]) {
          faqsByTaskId[faq.taskId] = [];
        }
        faqsByTaskId[faq.taskId].push(faq);
      });

      // Add questions and FAQs to tasks
      tasksWithRelations.forEach((task) => {
        task.questions = questionsByTaskId[task.id] || [];
        task.faqs = faqsByTaskId[task.id] || [];
      });
    }

    return tasksWithRelations;
  }

  // Fix the findById method
  async findById(id: number): Promise<TaskWithRelations | undefined> {
    const result = await db
      .select()
      .from(tasks)
      .leftJoin(categories, eq(tasks.categoryId, categories.id))
      .where(eq(tasks.id, id))
      .limit(1);

    if (result.length === 0) {
      return undefined;
    }

    const row = result[0];
    const task = row.tasks;
    const category = row.categories
      ? {
          id: row.categories.id,
          name: row.categories.name,
          slug: row.categories.slug,
        }
      : undefined;

    const taskWithRelations: TaskWithRelations = {
      ...task,
      category,
    };

    // Fetch questions
    const questions = await db
      .select()
      .from(taskQuestions)
      .where(eq(taskQuestions.taskId, id))
      .orderBy(asc(taskQuestions.displayOrder));

    // Fetch FAQs
    const faqs = await db
      .select()
      .from(taskFaqs)
      .where(eq(taskFaqs.taskId, id))
      .orderBy(asc(taskFaqs.displayOrder));

    taskWithRelations.questions = questions;
    taskWithRelations.faqs = faqs;

    return taskWithRelations;
  }

  // Fix the findBySlug method
  async findBySlug(slug: string): Promise<TaskWithRelations | undefined> {
    const result = await db
      .select()
      .from(tasks)
      .leftJoin(categories, eq(tasks.categoryId, categories.id))
      .where(eq(tasks.slug, slug))
      .limit(1);

    if (result.length === 0) {
      return undefined;
    }

    const row = result[0];
    const task = row.tasks;
    const category = row.categories
      ? {
          id: row.categories.id,
          name: row.categories.name,
          slug: row.categories.slug,
        }
      : undefined;

    const taskWithRelations: TaskWithRelations = {
      ...task,
      category,
    };

    // Fetch questions
    const questions = await db
      .select()
      .from(taskQuestions)
      .where(eq(taskQuestions.taskId, task.id))
      .orderBy(asc(taskQuestions.displayOrder));

    // Fetch FAQs
    const faqs = await db
      .select()
      .from(taskFaqs)
      .where(eq(taskFaqs.taskId, task.id))
      .orderBy(asc(taskFaqs.displayOrder));

    taskWithRelations.questions = questions;
    taskWithRelations.faqs = faqs;

    return taskWithRelations;
  }

  async create(
    taskData: Omit<NewTask, "slug"> & {
      slug?: string;
      questions?: Omit<
        NewTaskQuestion,
        "id" | "taskId" | "createdAt" | "updatedAt"
      >[];
      faqs?: Omit<NewTaskFaq, "id" | "taskId" | "createdAt" | "updatedAt">[];
    }
  ): Promise<TaskWithRelations> {
    const { questions, faqs, ...data } = taskData;

    // Generate slug if not provided
    const slug = data.slug || slugify(data.name, { lower: true, strict: true });

    // Check if slug already exists
    const existingTask = await db
      .select()
      .from(tasks)
      .where(eq(tasks.slug, slug))
      .limit(1);

    if (existingTask.length > 0) {
      throw new AppError("Task with this slug already exists", 400);
    }

    // Start a transaction
    return await db.transaction(async (tx) => {
      // Create task
      const taskResult = await tx
        .insert(tasks)
        .values({
          ...data,
          slug,
        })
        .returning();

      const task = taskResult[0];

      // Add questions if provided
      if (questions && questions.length > 0) {
        const questionValues: Omit<NewTaskQuestion, "id">[] = questions.map(
          (question, index) => ({
            taskId: task.id,
            question: question.question,
            type: question.type,
            options: question.options,
            isRequired: question.isRequired || false,
            displayOrder: question.displayOrder || index,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
        );

        await tx.insert(taskQuestions).values(questionValues);
      }

      // Add FAQs if provided
      if (faqs && faqs.length > 0) {
        const faqValues: Omit<NewTaskFaq, "id">[] = faqs.map((faq, index) => ({
          taskId: task.id,
          question: faq.question,
          answer: faq.answer,
          displayOrder: faq.displayOrder || index,
          createdAt: new Date(),
          updatedAt: new Date(),
        }));

        await tx.insert(taskFaqs).values(faqValues);
      }

      // Return the created task with relations
      return this.findById(task.id) as Promise<TaskWithRelations>;
    });
  }

  async update(
    id: number,
    taskData: Partial<Omit<Task, "id" | "createdAt">> & {
      questions?: (
        | Omit<NewTaskQuestion, "taskId" | "createdAt" | "updatedAt">
        | {
            id: number;
            question?: string;
            type?: string;
            options?: string;
            isRequired?: boolean;
            displayOrder?: number;
          }
      )[];
      faqs?: (
        | Omit<NewTaskFaq, "taskId" | "createdAt" | "updatedAt">
        | {
            id: number;
            question?: string;
            answer?: string;
            displayOrder?: number;
          }
      )[];
    }
  ): Promise<TaskWithRelations | undefined> {
    const { questions, faqs, ...data } = taskData;

    // If slug is being updated, check if it already exists
    if (data.slug) {
      const existingTask = await db
        .select()
        .from(tasks)
        .where(and(eq(tasks.slug, data.slug), sql`${tasks.id} != ${id}`))
        .limit(1);

      if (existingTask.length > 0) {
        throw new AppError("Task with this slug already exists", 400);
      }
    }

    // If name is being updated but not slug, generate a new slug
    if (data.name && !data.slug) {
      data.slug = slugify(data.name, { lower: true, strict: true });

      // Check if generated slug already exists
      const existingTask = await db
        .select()
        .from(tasks)
        .where(and(eq(tasks.slug, data.slug), sql`${tasks.id} != ${id}`))
        .limit(1);

      if (existingTask.length > 0) {
        // Append ID to make slug unique
        data.slug = `${data.slug}-${id}`;
      }
    }

    // Start a transaction
    return await db.transaction(async (tx) => {
      // Update task
      const taskResult = await tx
        .update(tasks)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(tasks.id, id))
        .returning();

      if (taskResult.length === 0) {
        return undefined;
      }

      // Update questions if provided
      if (questions && questions.length > 0) {
        // Process questions to update, create, or delete
        const questionsToCreate: Omit<NewTaskQuestion, "id">[] = [];
        const questionsToUpdate: {
          id: number;
          data: Partial<Omit<TaskQuestion, "id" | "taskId">>;
        }[] = [];
        const existingQuestionIds: number[] = [];

        questions.forEach((question, index) => {
          if ("id" in question && question.id !== undefined) {
            // Update existing question
            existingQuestionIds.push(question.id);
            questionsToUpdate.push({
              id: question.id,
              data: {
                question: question.question,
                type: question.type,
                options: question.options,
                isRequired: question.isRequired,
                displayOrder:
                  question.displayOrder !== undefined
                    ? question.displayOrder
                    : index,
                updatedAt: new Date(),
              },
            });
          } else {
            // Create new question
            questionsToCreate.push({
              taskId: id,
              question: question.question as string,
              type: question.type as string,
              options: question.options,
              isRequired: question.isRequired || false,
              displayOrder: question.displayOrder || index,
              createdAt: new Date(),
              updatedAt: new Date(),
            });
          }
        });

        // Delete questions that are not in the update list
        if (existingQuestionIds.length > 0) {
          await tx
            .delete(taskQuestions)
            .where(
              and(
                eq(taskQuestions.taskId, id),
                sql`${taskQuestions.id} NOT IN (${existingQuestionIds.join(",")})`
              )
            );
        } else {
          // If no existing questions are being kept, delete all
          await tx.delete(taskQuestions).where(eq(taskQuestions.taskId, id));
        }

        // Update existing questions
        for (const question of questionsToUpdate) {
          await tx
            .update(taskQuestions)
            .set(question.data)
            .where(
              and(
                eq(taskQuestions.id, question.id),
                eq(taskQuestions.taskId, id)
              )
            );
        }

        // Create new questions
        if (questionsToCreate.length > 0) {
          await tx.insert(taskQuestions).values(questionsToCreate);
        }
      }

      // Update FAQs if provided
      if (faqs && faqs.length > 0) {
        // Process FAQs to update, create, or delete
        const faqsToCreate: Omit<NewTaskFaq, "id">[] = [];
        const faqsToUpdate: {
          id: number;
          data: Partial<Omit<TaskFaq, "id" | "taskId">>;
        }[] = [];
        const existingFaqIds: number[] = [];

        faqs.forEach((faq, index) => {
          if ("id" in faq && faq.id !== undefined) {
            // Update existing FAQ
            existingFaqIds.push(faq.id);
            faqsToUpdate.push({
              id: faq.id,
              data: {
                question: faq.question,
                answer: faq.answer,
                displayOrder:
                  faq.displayOrder !== undefined ? faq.displayOrder : index,
                updatedAt: new Date(),
              },
            });
          } else {
            // Create new FAQ
            faqsToCreate.push({
              taskId: id,
              question: faq.question as string,
              answer: faq.answer as string,
              displayOrder: faq.displayOrder || index,
              createdAt: new Date(),
              updatedAt: new Date(),
            });
          }
        });

        // Delete FAQs that are not in the update list
        if (existingFaqIds.length > 0) {
          await tx
            .delete(taskFaqs)
            .where(
              and(
                eq(taskFaqs.taskId, id),
                sql`${taskFaqs.id} NOT IN (${existingFaqIds.join(",")})`
              )
            );
        } else {
          // If no existing FAQs are being kept, delete all
          await tx.delete(taskFaqs).where(eq(taskFaqs.taskId, id));
        }

        // Update existing FAQs
        for (const faq of faqsToUpdate) {
          await tx
            .update(taskFaqs)
            .set(faq.data)
            .where(and(eq(taskFaqs.id, faq.id), eq(taskFaqs.taskId, id)));
        }

        // Create new FAQs
        if (faqsToCreate.length > 0) {
          await tx.insert(taskFaqs).values(faqsToCreate);
        }
      }

      // Return the updated task with relations
      return this.findById(id) as Promise<TaskWithRelations>;
    });
  }

  async delete(id: number): Promise<boolean> {
    // In a real application, you might want to check if there are bookings or other
    // related records for this task before deleting

    return await db.transaction(async (tx) => {
      // Delete questions
      await tx.delete(taskQuestions).where(eq(taskQuestions.taskId, id));

      // Delete FAQs
      await tx.delete(taskFaqs).where(eq(taskFaqs.taskId, id));

      // Delete task
      const result = await tx.delete(tasks).where(eq(tasks.id, id)).returning();

      return result.length > 0;
    });
  }

  async toggleActive(id: number, isActive: boolean): Promise<Task | undefined> {
    const result = await db
      .update(tasks)
      .set({
        isActive,
        updatedAt: new Date(),
      })
      .where(eq(tasks.id, id))
      .returning();

    return result[0];
  }

  async updateRating(id: number, rating: number): Promise<Task | undefined> {
    const task = await this.findById(id);

    if (!task) {
      return undefined;
    }

    const totalCompletions = (task.totalCompletions || 0) + 1;
    const currentRating = task.averageRating || 0;

    // Calculate new average rating
    const newRating =
      (currentRating * (totalCompletions - 1) + rating) / totalCompletions;

    const result = await db
      .update(tasks)
      .set({
        averageRating: newRating,
        totalCompletions,
        updatedAt: new Date(),
      })
      .where(eq(tasks.id, id))
      .returning();

    return result[0];
  }

  async getFeaturedTasks(limit = 6): Promise<TaskWithRelations[]> {
    return this.findAll({
      isFeatured: true,
      limit,
      sort: "createdAt",
      order: "desc",
    });
  }

  async getPopularTasks(limit = 6): Promise<TaskWithRelations[]> {
    return this.findAll({
      isPopular: true,
      limit,
      sort: "rating",
      order: "desc",
    });
  }

  async getRelatedTasks(
    taskId: number,
    limit = 4
  ): Promise<TaskWithRelations[]> {
    const task = await this.findById(taskId);

    if (!task || !task.categoryId) {
      return [];
    }

    return this.findAll({
      categoryId: task.categoryId,
      limit,
      sort: "rating",
      order: "desc",
    });
  }
}

export const taskService = new TaskService();
