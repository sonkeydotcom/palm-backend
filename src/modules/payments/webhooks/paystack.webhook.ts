import type { Request, Response } from "express";
import crypto from "crypto";
import { config } from "../config";
import { paymentService } from "../services/payment-service";
import { logger } from "../utils/logger";

export class WebhookController {
  async handlePaystackWebhook(req: Request, res: Response) {
    // Validate webhook signature
    const hash = crypto
      .createHmac("sha512", config.paystack.webhookSecret || "")
      .update(JSON.stringify(req.body))
      .digest("hex");

    if (hash !== req.headers["x-paystack-signature"]) {
      logger.warn("Invalid Paystack webhook signature");
      return res.status(400).send("Invalid signature");
    }

    const event = req.body;

    // Handle different event types
    switch (event.event) {
      case "charge.success":
        await this.handleSuccessfulPayment(event.data);
        break;

      case "transfer.success":
        await this.handleSuccessfulTransfer(event.data);
        break;

      case "transfer.failed":
        await this.handleFailedTransfer(event.data);
        break;

      default:
        logger.info(`Unhandled Paystack webhook event: ${event.event}`);
    }

    // Always return a 200 to acknowledge receipt
    return res.status(200).send("Webhook received");
  }

  private async handleSuccessfulPayment(data: any) {
    try {
      // Extract reference from metadata
      const reference = data.reference;

      // Verify and update payment
      await paymentService.verifyPayment(reference);

      logger.info(`Payment successful for reference: ${reference}`);
    } catch (error) {
      logger.error("Error handling successful payment webhook", error);
    }
  }

  private async handleSuccessfulTransfer(data: any) {
    // Handle successful transfer to tasker
    logger.info(`Transfer successful: ${data.reference}`);
  }

  private async handleFailedTransfer(data: any) {
    // Handle failed transfer to tasker
    logger.error(`Transfer failed: ${data.reference}, reason: ${data.reason}`);
  }
}

export const webhookController = new WebhookController();
import { Router } from "express";
import { webhookController } from "../controllers/webhook-controller";

const router = Router();

// Webhook routes don't need authentication
router.post(
  "/paystack",
  webhookController.handlePaystackWebhook.bind(webhookController)
);

export const webhookRoutes = router;
