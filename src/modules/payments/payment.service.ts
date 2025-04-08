import db from "../../config/database";
import { NewPayment, payments } from "./payment.schema";

export class PaymentService {
  async initiatePayment(data: NewPayment) {
    const results = await db.insert(payments).values(data).returning();
    return results[0];
  }
}

export const paymentService = new PaymentService();
