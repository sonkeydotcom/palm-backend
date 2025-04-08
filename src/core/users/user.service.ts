import { eq } from "drizzle-orm";
import db from "../../common/config/database";
import { NewUser, User, users } from "./user.schema";
import { AppError } from "../../common/utils/app-error";
import bcrypt from "bcrypt";

export class UserService {
  async findAll(): Promise<User[]> {
    return db.select().from(users);
  }

  async findById(id: number): Promise<User | null> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async findByEmail(email: string): Promise<User | null> {
    const result = await db.select().from(users).where(eq(users.email, email));
    return result[0];
  }

  async create(
    userData: Omit<NewUser, "password"> & { password: string }
  ): Promise<User> {
    const { password, ...rest } = userData;

    // check if user already exists
    const existingUser = await this.findByEmail(rest.email);
    if (existingUser) {
      throw new AppError("Email already exists", 400);
    }
    // const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await db
      .insert(users)
      .values({
        ...rest,
        password: hashedPassword,
      })
      .returning();
    return result[0];
  }

  async update(id: number, userDate: Partial<User>): Promise<User | null> {
    const result = await db
      .update(users)
      .set({
        ...userDate,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();

    return result[0];
  }

  async delete(id: number): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id)).returning();
    return result.length > 0;
  }
}

export const userService = new UserService();
