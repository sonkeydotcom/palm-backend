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
import { paystackService } from "./paystack.service";
import { userService } from "../users/user.service";

export class PaymentService {
  async createPaymentIntent(
    bookingId: number
  ): Promise<{ reference: string; authorizationUrl: string }> {
    // Get booking details
    const bookingResult = await db
      .select()
      .from(bookings)
      .where(eq(bookings.id, bookingId))
      .limit(1);

    if (bookingResult.length === 0) {
      throw new AppError("Booking not found", 404);
    }

    const booking = bookingResult[0];

    // Get user details
    const user = await userService.findById(booking.userId);

    if (!user) {
      throw new AppError("User not found", 404);
    }

    // Calculate amount in kobo (Naira * 100)
    const amountInKobo =
      booking.totalAmount || booking.hourlyRate * booking.estimatedHours * 100;

    // Generate a unique reference
    const reference = `booking-${bookingId}-${Date.now()}`;

    // Initialize Paystack transaction
    const paystackResponse = await paystackService.initializeTransaction({
      amount: amountInKobo,
      email: user.email,
      reference,
      metadata: {
        booking_id: bookingId,
        user_id: booking.userId,
        tasker_id: booking.taskerId,
      },
    });

    if (!paystackResponse.status) {
      throw new AppError("Failed to initialize payment", 500);
    }

    // Create payment record
    await db.insert(payments).values({
      bookingId,
      userId: booking.userId,
      providerId: booking.taskerId, // Using taskerId as providerId
      amount: amountInKobo,
      currency: "NGN",
      paymentMethod: "paystack",
      paymentMethodDetails: { type: "card" },
      status: "pending",
      paymentIntentId: reference,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Update booking payment status
    await db
      .update(bookings)
      .set({
        paymentStatus: "processing",
        paymentIntentId: reference,
      })
      .where(eq(bookings.id, bookingId));

    return {
      reference: paystackResponse.data.reference,
      authorizationUrl: paystackResponse.data.authorization_url,
    };
  }

  async verifyPayment(reference: string): Promise<NewPayment> {
    // Verify payment with Paystack
    const verificationResult =
      await paystackService.verifyTransaction(reference);

    if (
      !verificationResult.status ||
      verificationResult.data.status !== "success"
    ) {
      throw new AppError("Payment verification failed", 400);
    }

    // Get payment by reference
    const paymentResult = await db
      .select()
      .from(payments)
      .where(eq(payments.paymentIntentId, reference))
      .limit(1);

    if (paymentResult.length === 0) {
      throw new AppError("Payment not found", 404);
    }

    const payment = paymentResult[0];

    // Update payment status
    const updatedPayment = await this.updatePaymentStatus(
      payment.id,
      "succeeded",
      verificationResult.data.reference
    );

    if (!updatedPayment) {
      throw new AppError("Failed to update payment status", 500);
    }

    return updatedPayment;
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

    // Process refund with Paystack
    const refundResult = await paystackService.createRefund({
      transaction: payment.transactionId || payment.paymentIntentId || "",
      amount: amount, // amount in kobo
    });

    if (!refundResult.status) {
      throw new AppError("Refund processing failed", 500);
    }

    // Update payment record
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

  // async processRefund(
  //   paymentId: number,
  //   amount: number,
  //   reason?: string
  // ): Promise<NewPayment | undefined> {
  //   const payment = await this.getPaymentById(paymentId);

  //   if (!payment) {
  //     throw new AppError("Payment not found", 404);
  //   }

  //   if (payment.status !== "succeeded") {
  //     throw new AppError("Cannot refund a payment that has not succeeded", 400);
  //   }

  //   // In a real implementation, you would call your payment processor's API here

  //   const result = await db
  //     .update(payments)
  //     .set({
  //       refundAmount: amount.toString(),
  //       refundReason: reason,
  //       refundDate: new Date(),
  //       status: "refunded",
  //       updatedAt: new Date(),
  //     })
  //     .where(eq(payments.id, paymentId))
  //     .returning();

  //   // Update booking payment status
  //   await db
  //     .update(bookings)
  //     .set({ paymentStatus: "refunded" })
  //     .where(eq(bookings.id, payment.bookingId));

  //   return result[0];
  // }

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
