import { eq } from "drizzle-orm";
import db from "../../config/database";
import { Service, services } from "../services/services.schema";

export class TaskService {
  // Get all tasks from the database
  async getAllTasks(): Promise<Service[]> {
    return db.select().from(services);
  }

  // Get a task by its ID
  async getTaskById(id: number): Promise<Service | null> {
    const result = await db.select().from(services).where(eq(services.id, id));
    return result[0];
  }

  // Get a tasks by provider ID
  async getTasksByProviderId(providerId: number): Promise<Service[]> {
    const result = await db
      .select()
      .from(services)
      .where(eq(services.providerId, providerId));
    return result;
  }

  // Create a new task in the database

  async createTask(taskData: Omit<Service, "id">): Promise<Service> {
    const result = await db.insert(services).values(taskData).returning();
    return result[0];
  }
}

export const taskService = new TaskService();
