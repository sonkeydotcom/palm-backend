import db from "../../config/database";
import { Service, services } from "../services/services.schema";

export class TaskService {
  async getAllTasks(): Promise<Service[]> {
    return db.select().from(services);
  }
}

export const taskService = new TaskService();
