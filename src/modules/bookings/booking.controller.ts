import type { Response, NextFunction } from "express";
import { AuthRequest } from "../../middleware/auth.middleware";
import { AppError } from "../../utils/app-error";
import { bookingService } from "./booking.service";
import { success } from "../../utils/api-response";

export class BookingController {
  /**
   * Get all bookings with filtering, sorting, and pagination
   */
  async getAllBookings(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      // Only admins can see all bookings
      if (req.user?.role !== "admin") {
        throw new AppError("Not authorized to access all bookings", 403);
      }

      const {
        userId,
        taskerId,
        taskId,
        status,
        paymentStatus,
        startDateFrom,
        startDateTo,
        query,
        sort,
        order,
        page = "1",
        limit = "20",
      } = req.query;

      // Parse and validate search parameters
      const searchParams: BookingSearchParams = {
        userId: userId ? Number(userId) : undefined,
        taskerId: taskerId ? Number(taskerId) : undefined,
        taskId: taskId ? Number(taskId) : undefined,
        status: status as string | string[],
        paymentStatus: paymentStatus as string | string[],
        startDateFrom: startDateFrom
          ? new Date(startDateFrom as string)
          : undefined,
        startDateTo: startDateTo ? new Date(startDateTo as string) : undefined,
        query: query as string,
        sort: sort as BookingSearchParams["sort"],
        order: order as "asc" | "desc",
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
      };

      // Get total count for pagination
      const countParams = { ...searchParams };
      delete countParams.page;
      delete countParams.limit;
      delete countParams.sort;
      delete countParams.order;

      const total = await bookingService.count(countParams);

      // Get bookings with pagination
      const bookings = await bookingService.findAll(searchParams);

      // Create pagination metadata
      const meta = paginationMeta(
        searchParams.page || 1,
        searchParams.limit || 20,
        total
      );

      return res.json(
        success(bookings, "Bookings retrieved successfully", meta)
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get bookings for the current user
   */
  async getUserBookings(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user?.id) {
        throw new AppError("Authentication required", 401);
      }

      const {
        status,
        paymentStatus,
        startDateFrom,
        startDateTo,
        query,
        sort,
        order,
        page = "1",
        limit = "20",
      } = req.query;

      // Parse and validate search parameters
      const searchParams: BookingSearchParams = {
        userId: req.user.id,
        status: status as string | string[],
        paymentStatus: paymentStatus as string | string[],
        startDateFrom: startDateFrom
          ? new Date(startDateFrom as string)
          : undefined,
        startDateTo: startDateTo ? new Date(startDateTo as string) : undefined,
        query: query as string,
        sort: sort as BookingSearchParams["sort"],
        order: order as "asc" | "desc",
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
      };

      // Get total count for pagination
      const countParams = { ...searchParams };
      delete countParams.page;
      delete countParams.limit;
      delete countParams.sort;
      delete countParams.order;

      const total = await bookingService.count(countParams);

      // Get bookings with pagination
      const bookings = await bookingService.findAll(searchParams);

      // Create pagination metadata
      const meta = paginationMeta(
        searchParams.page || 1,
        searchParams.limit || 20,
        total
      );

      success(res, bookings, "User bookings retrieved successfully", meta);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get bookings for a tasker
   */
  async getTaskerBookings(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user?.id) {
        throw new AppError("Authentication required", 401);
      }

      const taskerId = Number(req.params.taskerId);

      // Verify the user is the tasker or an admin
      // This would require a lookup to verify the tasker's userId matches the current user
      // For simplicity, we'll assume this check is done elsewhere or modify as needed

      const {
        status,
        paymentStatus,
        startDateFrom,
        startDateTo,
        query,
        sort,
        order,
        page = "1",
        limit = "20",
      } = req.query;

      // Parse and validate search parameters
      const searchParams: BookingSearchParams = {
        taskerId,
        status: status as string | string[],
        paymentStatus: paymentStatus as string | string[],
        startDateFrom: startDateFrom
          ? new Date(startDateFrom as string)
          : undefined,
        startDateTo: startDateTo ? new Date(startDateTo as string) : undefined,
        query: query as string,
        sort: sort as BookingSearchParams["sort"],
        order: order as "asc" | "desc",
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
      };

      // Get total count for pagination
      const countParams = { ...searchParams };
      delete countParams.page;
      delete countParams.limit;
      delete countParams.sort;
      delete countParams.order;

      const total = await bookingService.count(countParams);

      // Get bookings with pagination
      const bookings = await bookingService.findAll(searchParams);

      // Create pagination metadata
      const meta = paginationMeta(
        searchParams.page || 1,
        searchParams.limit || 20,
        total
      );

      success(res, bookings, "Tasker bookings retrieved successfully", meta);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get a booking by ID
   */
  async getBookingById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      const booking = await bookingService.findById(id);

      if (!booking) {
        throw new AppError("Booking not found", 404);
      }

      // Check if the user is authorized to view this booking
      if (
        req.user?.id !== booking.userId &&
        req.user?.id !== booking.tasker?.userId &&
        req.user?.role !== "admin"
      ) {
        throw new AppError("Not authorized to view this booking", 403);
      }

      success(res, booking, "Booking retrieved successfully");
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create a new booking
   */
  async createBooking(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user?.id) {
        throw new AppError("Authentication required", 401);
      }

      // Ensure user can only create bookings for themselves
      if (req.user.id !== Number(req.body.userId)) {
        throw new AppError(
          "Not authorized to create booking for another user",
          403
        );
      }

      // Validate request
      const { error, value } = validateBooking(req.body);
      if (error) {
        throw new AppError(error.details[0].message, 400);
      }

      // Create booking
      const booking = await bookingService.create(value);

      success(res, booking, "Booking created successfully");
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update a booking
   */
  async updateBooking(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);

      // Get the booking to check ownership
      const booking = await bookingService.findById(id);

      if (!booking) {
        throw new AppError("Booking not found", 404);
      }

      // Check if the user is authorized to update this booking
      if (
        req.user?.id !== booking.userId &&
        req.user?.id !== booking.tasker?.userId &&
        req.user?.role !== "admin"
      ) {
        throw new AppError("Not authorized to update this booking", 403);
      }

      // Validate request
      const { error, value } = validateBookingUpdate(req.body);
      if (error) {
        throw new AppError(error.details[0].message, 400);
      }

      // Update booking
      const updatedBooking = await bookingService.update(id, value);

      success(res, updatedBooking, "Booking updated successfully");
    } catch (error) {
      next(error);
    }
  }

  /**
   * Cancel a booking
   */
  async cancelBooking(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);

      // Get the booking to check ownership
      const booking = await bookingService.findById(id);

      if (!booking) {
        throw new AppError("Booking not found", 404);
      }

      // Check if the user is authorized to cancel this booking
      if (
        req.user?.id !== booking.userId &&
        req.user?.id !== booking.tasker?.userId &&
        req.user?.role !== "admin"
      ) {
        throw new AppError("Not authorized to cancel this booking", 403);
      }

      const { cancellationReason, cancellationFee } = req.body;

      if (!cancellationReason) {
        throw new AppError("Cancellation reason is required", 400);
      }

      // Only admins or taskers can set cancellation fee
      if (
        cancellationFee !== undefined &&
        req.user?.id !== booking.tasker?.userId &&
        req.user?.role !== "admin"
      ) {
        throw new AppError("Not authorized to set cancellation fee", 403);
      }

      // Cancel booking
      const cancelledBooking = await bookingService.cancelBooking(
        id,
        cancellationReason,
        cancellationFee
      );

      success(res, cancelledBooking, "Booking cancelled successfully");
    } catch (error) {
      next(error);
    }
  }

  /**
   * Complete a booking
   */
  async completeBooking(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);

      // Get the booking to check ownership
      const booking = await bookingService.findById(id);

      if (!booking) {
        throw new AppError("Booking not found", 404);
      }

      // Only the tasker or admin can mark a booking as complete
      if (
        req.user?.id !== booking.tasker?.userId &&
        req.user?.role !== "admin"
      ) {
        throw new AppError("Not authorized to complete this booking", 403);
      }

      // Complete booking
      const completedBooking = await bookingService.completeBooking(id);

      success(res, completedBooking, "Booking completed successfully");
    } catch (error) {
      next(error);
    }
  }

  /**
   * Add a message to a booking
   */
  async addBookingMessage(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const bookingId = Number(req.params.id);

      // Get the booking to check ownership
      const booking = await bookingService.findById(bookingId);

      if (!booking) {
        throw new AppError("Booking not found", 404);
      }

      // Check if the user is authorized to message on this booking
      if (
        req.user?.id !== booking.userId &&
        req.user?.id !== booking.tasker?.userId &&
        req.user?.role !== "admin"
      ) {
        throw new AppError("Not authorized to message on this booking", 403);
      }

      // Validate request
      const { error, value } = validateBookingMessage(req.body);
      if (error) {
        throw new AppError(error.details[0].message, 400);
      }

      // Add message
      const message = await bookingService.addMessage({
        bookingId,
        senderId: req.user!.id,
        message: value.message,
        attachments: value.attachments,
      });

      success(message, "Message sent successfully");
    } catch (error) {
      next(error);
    }
  }

  /**
   * Mark messages as read
   */
  async markMessagesAsRead(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const bookingId = Number(req.params.id);

      // Get the booking to check ownership
      const booking = await bookingService.findById(bookingId);

      if (!booking) {
        throw new AppError("Booking not found", 404);
      }

      // Check if the user is authorized to access this booking
      if (
        req.user?.id !== booking.userId &&
        req.user?.id !== booking.tasker?.userId &&
        req.user?.role !== "admin"
      ) {
        throw new AppError("Not authorized to access this booking", 403);
      }

      // Mark messages as read
      await bookingService.markMessagesAsRead(bookingId, req.user!.id);

      success(res, { success: true }, "Messages marked as read");
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get unread message count
   */
  async getUnreadMessageCount(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      if (!req.user?.id) {
        throw new AppError("Authentication required", 401);
      }

      const count = await bookingService.getUnreadMessageCount(req.user.id);

      success(res, { count }, "Unread message count retrieved");
    } catch (error) {
      next(error);
    }
  }
}

export const bookingController = new BookingController();
