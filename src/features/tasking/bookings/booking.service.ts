import {
  bookings,
  Booking,
  NewBooking,
  BookingMessage,
  bookingMessages,
} from "./booking.schema";
import { and, eq, sql, gte, lte, inArray, asc, desc } from "drizzle-orm";
import db from "../../config/database";

export interface BookingSearchParams {
  userId?: number;
  taskerId?: number;
  taskId?: number;
  status?: string | string[];
  paymentStatus?: string | string[];
  startDateFrom?: Date;
  startDateTo?: Date;
  query?: string;
  sort?: "startTime" | "createdAt" | "totalAmount";
  order?: "asc" | "desc";
  page?: number;
  limit?: number;
}

export interface BookingWithRelations extends Booking {
  user?: {
    id: number;
    email: string;
    firstName?: string;
    lastName?: string;
    profileImage?: string;
  };
  tasker?: {
    id: number;
    userId: number;
    headline?: string;
    profilePhoto?: string;
    averageRating?: number;
    user?: {
      firstName?: string;
      lastName?: string;
      email: string;
    };
  };
  task?: {
    id: number;
    name: string;
    description?: string;
    image?: string;
  };
  taskerSkill?: {
    id: number;
    hourlyRate: number;
    quickPitch?: string;
  };
  location?: {
    id: number;
    address: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
  };
  messages?: BookingMessage[];
}

export const bookingService = {
  /**
   * Create a new booking
   */
  async create(bookingData: NewBooking): Promise<Booking> {
    const [newBooking] = await db
      .insert(bookings)
      .values(bookingData)
      .returning();
    return newBooking;
  },

  /**
   * Find a booking by ID
   */
  async findById(id: number): Promise<Booking | null> {
    const [booking] = await db
      .select()
      .from(bookings)
      .where(eq(bookings.id, id))
      .limit(1);
    return booking || null;
  },

  /**
   * Find all bookings with filtering, sorting, and pagination
   */
  async findAll(params: BookingSearchParams): Promise<Booking[]> {
    const {
      userId,
      taskerId,
      taskId,
      status,
      paymentStatus,
      startDateFrom,
      startDateTo,
      sort,
      order,
      page,
      limit,
    } = params;

    let query = db.select().from(bookings).$dynamic();

    // Apply filters
    if (userId) query = query.where(eq(bookings.userId, userId));
    if (taskerId) query = query.where(eq(bookings.taskerId, taskerId));
    if (taskId) query = query.where(eq(bookings.taskId, taskId));
    if (status) {
      if (Array.isArray(status)) {
        query = query.where(
          inArray(
            bookings.status,
            sql`(${status.map((s) => `'${s}'`).join(", ")})`
          )
        );
      }
      // else {
      //   query = query.where(eq(bookings.status, status));
      // }
    }

    if (paymentStatus) {
      if (Array.isArray(paymentStatus)) {
        query = query.where(inArray(bookings.paymentStatus, paymentStatus));
      } else {
        query = query.where(eq(bookings.paymentStatus, paymentStatus));
      }
    }
    if (startDateFrom && startDateTo) {
      query = query.where(
        and(
          gte(bookings.startTime, startDateFrom),
          lte(bookings.startTime, startDateTo)
        )
      );
    }

    // Apply sorting
    if (sort && order) {
      const sortColumnMap = {
        startTime: bookings.startTime,
        createdAt: bookings.createdAt,
        totalAmount: bookings.totalPrice, // Ensure the actual column name matches your schema
      };

      const sortColumn = sortColumnMap[sort as keyof typeof sortColumnMap];

      if (sortColumn) {
        query = query.orderBy(
          order === "asc" ? asc(sortColumn) : desc(sortColumn)
        );
      }
    }

    // Apply pagination
    if (page && limit) {
      const offset = (page - 1) * limit;
      query = query.limit(limit).offset(offset);
    }

    const results = await query;
    return results;
  },

  /**
   * Count bookings based on filters
   */
  async count(
    params: Omit<BookingSearchParams, "page" | "limit" | "sort" | "order">
  ): Promise<number> {
    const {
      userId,
      taskerId,
      taskId,
      status,
      paymentStatus,
      startDateFrom,
      startDateTo,
    } = params;

    let query = db
      .select({ count: sql<number>`count(*)` })
      .from(bookings)
      .$dynamic();

    // Apply filters
    if (userId) query = query.where(eq(bookings.userId, userId));
    if (taskerId) query = query.where(eq(bookings.taskerId, taskerId));
    if (taskId) query = query.where(eq(bookings.taskId, taskId));
    if (status) {
      if (Array.isArray(status)) {
        query = query.where(
          inArray(
            bookings.status,
            sql`(${status.map((s) => `'${s}'`).join(", ")})`
          )
        );
      }

      // query = query.where(eq(bookings.status, status));
    }

    if (paymentStatus) {
      if (Array.isArray(paymentStatus)) {
        query = query.where(inArray(bookings.paymentStatus, paymentStatus));
      } else {
        query = query.where(eq(bookings.paymentStatus, paymentStatus));
      }
    }
    if (startDateFrom && startDateTo) {
      query = query.where(
        and(
          gte(bookings.startTime, startDateFrom),
          lte(bookings.startTime, startDateTo)
        )
      );
    }

    const [{ count }] = await query;
    return count;
  },

  /**
   * Update a booking
   */
  async update(id: number, bookingData: Partial<Booking>): Promise<Booking> {
    const [updatedBooking] = await db
      .update(bookings)
      .set(bookingData)
      .where(eq(bookings.id, id))
      .returning();
    return updatedBooking;
  },

  /**
   * Cancel a booking
   */
  async cancelBooking(
    id: number,
    cancellationReason: string,
    cancellationFee?: number
  ): Promise<Booking> {
    const [cancelledBooking] = await db
      .update(bookings)
      .set({
        status: "cancelled",
        cancellationReason,
        cancellationFee,
        cancelledAt: new Date(),
      })
      .where(eq(bookings.id, id))
      .returning();
    return cancelledBooking;
  },

  /**
   * Complete a booking
   */
  async completeBooking(id: number): Promise<Booking> {
    const [completedBooking] = await db
      .update(bookings)
      .set({
        status: "completed",
        updatedAt: new Date(),
      })
      .where(eq(bookings.id, id))
      .returning();
    return completedBooking;
  },

  /**
   * Add a message to a booking
   */
  async addMessage(messageData: {
    bookingId: number;
    senderId: number;
    message: string;
    attachments?: string[];
  }): Promise<BookingMessage> {
    // Assuming you have a `booking_messages` table for storing messages
    const [newMessage] = await db
      .insert(bookingMessages)
      .values(messageData)
      .returning();
    return newMessage;
  },

  /**
   * Mark messages as read
   */
  async markMessagesAsRead(
    bookingId: number,
    userId: number
  ): Promise<boolean> {
    // Assuming you have a `booking_messages` table with a `readAt` column
    const result = await db
      .update(bookingMessages)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(bookingMessages.bookingId, bookingId),
          eq(bookingMessages.senderId, userId),
          eq(bookingMessages.isRead, false)
        )
      )
      .returning();
    return result.length > 0;
  },

  /**
   * Get unread message count for a user
   */
  async getUnreadMessageCount(userId: number): Promise<number> {
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(bookingMessages)
      .where(
        and(
          eq(bookingMessages.senderId, userId),
          eq(bookingMessages.isRead, false)
        )
      );
    return count;
  },
};
