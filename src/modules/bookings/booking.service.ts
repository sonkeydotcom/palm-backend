import db from "../../config/database";
import { Booking, bookings } from "./booking.schema";

export class BookingService {
  async findAll(): Promise<Booking[]> {
    return db.select().from(bookings);
  }

  async findById(id: number): Promise<Booking | null> {
    const result = await db.select().from(bookings).where(eq(bookings.id, id));
    return result[0];
  }
}

export const bookingService = new BookingService();
