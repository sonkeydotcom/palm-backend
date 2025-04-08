import { eq, like, and, or, desc, asc, inArray, sql } from "drizzle-orm";
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
import { Service, services } from "../../tasking/services/service.schema";
import slugify from "slugify";
import { AppError } from "../../utils/app-error";
import { Location, locations } from "../locations/location.schema";

export interface TaskSearchParams {
  query?: string;
  serviceId?: number;
  serviceSlug?: string;
  minRate?: number;
  maxRate?: number;
  tags?: string[];
  locationId?: number;
  radius?: number;
  sort?: "name" | "rate" | "rating" | "createdAt" | "distance";
  order?: "asc" | "desc";
  page?: number;
  limit?: number;
  includeInactive?: boolean;
}

export interface TaskWithRelations extends Task {
  service?: Service | null;
  questions?: TaskQuestion[];
  faqs?: TaskFaq[];
  location?: Location | null;
}

export class TaskService {
  async findAll(options: TaskSearchParams = {}): Promise<TaskWithRelations[]> {
    const {
      // includeInactive = false,
      sort = "createdAt",
      order = "desc",
      page = 1,
      limit = 20,
    } = options;

    const validPage = Math.max(page, 1);
    const validLimit = Math.max(limit, 1);

    const conditions = [];

    // if (!includeInactive) conditions.push(eq(tasks.isActive, true));
    if (options.query) {
      conditions.push(
        or(
          like(tasks.name, `%${options.query}%`),
          like(tasks.description, `%${options.query}%`),
          like(tasks.shortDescription, `%${options.query}%`)
        )
      );
    }
    // if (options.userId) conditions.push(eq(tasks.userId, options.userId));
    if (options.serviceId)
      conditions.push(eq(tasks.serviceId, options.serviceId));
    if (options.serviceSlug)
      conditions.push(eq(services.slug, options.serviceSlug));
    if (options.locationId)
      conditions.push(eq(tasks.locationId, options.locationId));

    let sortColumn;
    switch (sort) {
      case "name":
        sortColumn = tasks.name;
        break;
      // case "rate":
      //   sortColumn = tasks.baseHourlyRate;
      //   break;
      // case "rating":
      //   sortColumn = tasks.averageRating;
      //   break;
      default:
        sortColumn = tasks.createdAt;
    }

    let queryBuilder = db
      .select()
      .from(tasks)
      .leftJoin(services, eq(tasks.serviceId, services.id))
      .leftJoin(locations, eq(tasks.locationId, locations.id))
      .where(conditions.length ? and(...conditions) : undefined)
      .$dynamic();

    if (sortColumn) {
      queryBuilder = queryBuilder.orderBy(
        order === "asc" ? asc(sortColumn) : desc(sortColumn)
      );
    }

    const results = await queryBuilder
      .limit(validLimit)
      .offset((validPage - 1) * validLimit);

    const tasksWithRelations: TaskWithRelations[] = results.map((row) => {
      const task = row.tasks;
      const service = row.services ? row.services : undefined;

      const location = row.locations ? row.locations : null;

      return { ...task, service, location };
    });

    const taskIds = tasksWithRelations.map((task) => task.id);
    if (taskIds.length) {
      const [questions, faqs] = await Promise.all([
        db
          .select()
          .from(taskQuestions)
          .where(inArray(taskQuestions.taskId, taskIds)),
        db.select().from(taskFaqs).where(inArray(taskFaqs.taskId, taskIds)),
      ]);

      const questionsMap: Record<number, TaskQuestion[]> = {};
      const faqsMap: Record<number, TaskFaq[]> = {};

      questions.forEach((q) => {
        (questionsMap[q.taskId] ||= []).push(q);
      });
      faqs.forEach((f) => {
        (faqsMap[f.taskId] ||= []).push(f);
      });

      tasksWithRelations.forEach((task) => {
        task.questions = questionsMap[task.id] || [];
        task.faqs = faqsMap[task.id] || [];
      });
    }

    return tasksWithRelations;
  }

  // Fix the findById method
  async findById(id: number): Promise<TaskWithRelations | undefined> {
    const result = await db
      .select()
      .from(tasks)
      .leftJoin(services, eq(tasks.serviceId, services.id))
      .where(eq(tasks.id, id))
      .limit(1);

    if (result.length === 0) {
      return undefined;
    }

    const row = result[0];
    const task = row.tasks;
    const service = row.services ? row.services : undefined;

    const taskWithRelations: TaskWithRelations = {
      ...task,
      service,
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
      .leftJoin(services, eq(tasks.serviceId, services.id))
      .where(eq(tasks.slug, slug))
      .limit(1);

    if (result.length === 0) {
      return undefined;
    }

    const row = result[0];
    const task = row.tasks;
    const service = row.services ? row.services : undefined;

    const taskWithRelations: TaskWithRelations = {
      ...task,
      service,
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
    const slug = slugify(taskData.name, { lower: true, strict: true });

    // Check if slug already exists
    const existingTask = await db
      .select()
      .from(tasks)
      .where(eq(tasks.slug, slug))
      .limit(1);

    if (existingTask.length > 0) {
      throw new AppError("Task with similar name already exists", 400);
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

  async findByUserId(userId: number): Promise<TaskWithRelations[]> {
    const results = await db
      .select()
      .from(tasks)
      .where(eq(tasks.userId, userId))
      .leftJoin(services, eq(tasks.serviceId, services.id))
      .leftJoin(locations, eq(tasks.locationId, locations.id))
      .orderBy(desc(tasks.createdAt));

    return this.enrichTasksWithRelations(results);
  }

  async findByServiceId(serviceId: number): Promise<TaskWithRelations[]> {
    const results = await db
      .select()
      .from(tasks)
      .where(eq(tasks.serviceId, serviceId))
      .leftJoin(services, eq(tasks.serviceId, services.id))
      .leftJoin(locations, eq(tasks.locationId, locations.id))
      .orderBy(desc(tasks.createdAt));

    return this.enrichTasksWithRelations(results);
  }

  async findByTaskerId(taskerId: number): Promise<TaskWithRelations[]> {
    const results = await db
      .select()
      .from(tasks)
      .where(eq(tasks.taskerId, taskerId))
      .leftJoin(services, eq(tasks.serviceId, services.id))
      .leftJoin(locations, eq(tasks.locationId, locations.id))
      .orderBy(desc(tasks.createdAt));

    return this.enrichTasksWithRelations(results);
  }

  async updateStatus(
    taskId: number,
    status: "pending" | "accepted" | "rejected" | "completed"
  ): Promise<Task> {
    const [task] = await db
      .update(tasks)
      .set({ status })
      .where(eq(tasks.id, taskId))
      .returning();

    if (!task) {
      throw new AppError("Task not found", 404);
    }

    return task;
  }

  async assignTasker(taskId: number, taskerId: number): Promise<Task> {
    const [task] = await db
      .update(tasks)
      .set({ taskerId, status: "accepted" })
      .where(eq(tasks.id, taskId))
      .returning();

    if (!task) {
      throw new AppError("Task not found", 404);
    }

    return task;
  }

  // async updateRating(id: number, rating: number): Promise<Task | undefined> {
  //   const task = await this.findById(id);

  //   if (!task) {
  //     return undefined;
  //   }

  //   const totalCompletions = (task.totalCompletions || 0) + 1;
  //   const currentRating = task.averageRating || 0;

  //   // Calculate new average rating
  //   const newRating =
  //     (currentRating * (totalCompletions - 1) + rating) / totalCompletions;

  //   const result = await db
  //     .update(tasks)
  //     .set({
  //       averageRating: newRating,
  //       totalCompletions,
  //       updatedAt: new Date(),
  //     })
  //     .where(eq(tasks.id, id))
  //     .returning();

  //   return result[0];
  // }
  /**
   * Helper method to enrich tasks with relations
   */
  private async enrichTasksWithRelations(
    results: {
      tasks: Task;
      services?: Service | null;
      locations?: Location | null;
    }[]
  ): Promise<TaskWithRelations[]> {
    if (results.length === 0) return [];

    const taskIds = results.map((row) => row.tasks.id);
    const [questions, faqs] = await Promise.all([
      db
        .select()
        .from(taskQuestions)
        .where(inArray(taskQuestions.taskId, taskIds))
        .orderBy(asc(taskQuestions.displayOrder)),
      db
        .select()
        .from(taskFaqs)
        .where(inArray(taskFaqs.taskId, taskIds))
        .orderBy(asc(taskFaqs.displayOrder)),
    ]);

    const questionsByTaskId = questions.reduce(
      (acc, question) => {
        if (!acc[question.taskId]) acc[question.taskId] = [];
        acc[question.taskId].push(question);
        return acc;
      },
      {} as Record<number, TaskQuestion[]>
    );

    const faqsByTaskId = faqs.reduce(
      (acc, faq) => {
        if (!acc[faq.taskId]) acc[faq.taskId] = [];
        acc[faq.taskId].push(faq);
        return acc;
      },
      {} as Record<number, TaskFaq[]>
    );
    return results.map((row) => ({
      ...row.tasks,
      service: row.services ? row.services : null,
      location: row.locations ? row.locations : null,
      questions: questionsByTaskId[row.tasks.id] || [],
      faqs: faqsByTaskId[row.tasks.id] || [],
    }));
  }
}

export const taskService = new TaskService();
