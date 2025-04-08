import { and, eq } from "drizzle-orm";
import db from "../../config/database";
import { AppError } from "../../utils/app-error";
import { bookings } from "../bookings/booking.schema";
import {
  NewPayment,
  NewPaymentMethod,
  paymentMethods,
  payments,
} from "./payment.schema";

export class PaymentService {
  async createPayment(paymentData: NewPayment): Promise<NewPayment> {
    // Check if booking exists
    const bookingResult = await db
      .select()
      .from(bookings)
      .where(eq(bookings.id, paymentData.bookingId))
      .limit(1);

    if (bookingResult.length === 0) {
      throw new AppError("Booking not found", 404);
    }

    // Create payment record
    const result = await db.insert(payments).values(paymentData).returning();

    // Update booking payment status
    await db
      .update(bookings)
      .set({
        paymentStatus:
          paymentData.status === "succeeded" ? "paid" : "processing",
        paymentIntentId: paymentData.paymentIntentId,
      })
      .where(eq(bookings.id, paymentData.bookingId));

    return result[0];
  }

  async getPaymentById(id: number): Promise<NewPayment | undefined> {
    const result = await db
      .select()
      .from(payments)
      .where(eq(payments.id, id))
      .limit(1);

    return result[0];
  }

  async getPaymentsByUserId(userId: number): Promise<NewPayment[]> {
    return db.select().from(payments).where(eq(payments.userId, userId));
  }

  async getPaymentsByProviderId(taskerId: number): Promise<NewPayment[]> {
    return db.select().from(payments).where(eq(payments.taskerId, taskerId));
  }

  async getPaymentByBookingId(
    bookingId: number
  ): Promise<NewPayment | undefined> {
    const result = await db
      .select()
      .from(payments)
      .where(eq(payments.bookingId, bookingId))
      .limit(1);

    return result[0];
  }

  async updatePaymentStatus(
    id: number,
    status: string,
    transactionId?: string
  ): Promise<NewPayment | undefined> {
    const result = await db
      .update(payments)
      .set({
        status,
        transactionId,
        paymentDate: status === "succeeded" ? new Date() : undefined,
        updatedAt: new Date(),
      })
      .where(eq(payments.id, id))
      .returning();

    if (result.length === 0) {
      return undefined;
    }

    // Update booking payment status if payment succeeded
    if (status === "succeeded") {
      await db
        .update(bookings)
        .set({ paymentStatus: "paid" })
        .where(eq(bookings.id, result[0].bookingId));
    }

    return result[0];
  }

  async processRefund(
    paymentId: number,
    amount: number,
    reason?: string
  ): Promise<NewPayment | undefined> {
    const payment = await this.getPaymentById(paymentId);

    if (!payment) {
      throw new AppError("Payment not found", 404);
    }

    if (payment.status !== "succeeded") {
      throw new AppError("Cannot refund a payment that has not succeeded", 400);
    }

    // In a real implementation, you would call your payment processor's API here

    const result = await db
      .update(payments)
      .set({
        refundAmount: amount.toString(),
        refundReason: reason,
        refundDate: new Date(),
        status: "refunded",
        updatedAt: new Date(),
      })
      .where(eq(payments.id, paymentId))
      .returning();

    // Update booking payment status
    await db
      .update(bookings)
      .set({ paymentStatus: "refunded" })
      .where(eq(bookings.id, payment.bookingId));

    return result[0];
  }

  // Payment Methods
  async createPaymentMethod(
    paymentMethodData: NewPaymentMethod
  ): Promise<NewPaymentMethod> {
    // If this is set as default, unset any existing default
    if (paymentMethodData.isDefault) {
      await db
        .update(paymentMethods)
        .set({ isDefault: false })
        .where(
          and(
            eq(paymentMethods.userId, paymentMethodData.userId),
            eq(paymentMethods.isDefault, true)
          )
        );
    }

    const result = await db
      .insert(paymentMethods)
      .values(paymentMethodData)
      .returning();

    return result[0];
  }

  async getPaymentMethodsByUserId(userId: number): Promise<NewPaymentMethod[]> {
    return db
      .select()
      .from(paymentMethods)
      .where(eq(paymentMethods.userId, userId));
  }

  async getPaymentMethodById(
    id: number
  ): Promise<NewPaymentMethod | undefined> {
    const result = await db
      .select()
      .from(paymentMethods)
      .where(eq(paymentMethods.id, id))
      .limit(1);

    return result[0];
  }

  async updatePaymentMethod(
    id: number,
    data: Partial<NewPaymentMethod>
  ): Promise<NewPaymentMethod | undefined> {
    // If setting as default, unset any existing default
    if (data.isDefault) {
      const paymentMethod = await this.getPaymentMethodById(id);
      if (paymentMethod) {
        await db
          .update(paymentMethods)
          .set({ isDefault: false })
          .where(
            and(
              eq(paymentMethods.userId, paymentMethod.userId),
              eq(paymentMethods.isDefault, true)
            )
          );
      }
    }

    const result = await db
      .update(paymentMethods)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(paymentMethods.id, id))
      .returning();

    return result[0];
  }

  async deletePaymentMethod(id: number): Promise<boolean> {
    const result = await db
      .delete(paymentMethods)
      .where(eq(paymentMethods.id, id))
      .returning();

    return result.length > 0;
  }
}

export const paymentService = new PaymentService();
