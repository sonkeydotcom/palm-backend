import { eq } from "drizzle-orm";
import db from "../../config/database";
import { Booking, bookings, NewBooking } from "./booking.schema";

export class BookingService {
  async findAll(): Promise<Booking[]> {
    return db.select().from(bookings);
  }

  async findById(id: number): Promise<Booking | null> {
    const result = await db.select().from(bookings).where(eq(bookings.id, id));
    return result[0];
  }

  async create(bookingData: Omit<NewBooking, "id">): Promise<Booking> {
    const result = await db
      .insert(bookings)
      .values({ ...bookingData })
      .returning();

    return result[0];
  }

  async update(
    id: number,
    bookingData: Partial<Booking>
  ): Promise<Booking | null> {
    const result = await db
      .update(bookings)
      .set({
        ...bookingData,
        updatedAt: new Date(),
      })
      .where(eq(bookings.id, id))
      .returning();

    return result[0];
  }

  async delete(id: number): Promise<boolean> {
    const result = await db
      .delete(bookings)
      .where(eq(bookings.id, id))
      .returning();
    return result.length > 0;
  }
}

export const bookingService = new BookingService();
