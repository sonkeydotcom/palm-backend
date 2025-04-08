import axios from "axios";
import {
  PAYSTACK_API_URL,
  PAYSTACK_PRIVATE_KEY,
} from "../../common/config/env";
import { AppError } from "../../common/utils/app-error";

// Paystack API client
class PaystackService {
  private readonly baseUrl = PAYSTACK_API_URL;
  private readonly secretKey: string;
  private readonly headers: Record<string, string>;

  constructor() {
    this.secretKey = PAYSTACK_PRIVATE_KEY || "";

    if (!this.secretKey) {
      throw new Error("Paystack secret key is not configured");
    }

    this.headers = {
      Authorization: `Bearer ${this.secretKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    };
  }

  /**
   * Initialize a transaction
   */
  async initializeTransaction(data: {
    amount: number; // amount in kobo (Naira * 100)
    email: string;
    reference?: string;
    callbackUrl?: string;
    metadata?: any;
  }) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/transaction/initialize`,
        data,
        { headers: this.headers }
      );

      return response.data;
    } catch (error: any) {
      throw new AppError(
        error.response?.data?.message ||
          "Failed to initialize Paystack transaction",
        error.response?.status || 500
      );
    }
  }

  /**
   * Verify a transaction
   */
  async verifyTransaction(reference: string) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/transaction/verify/${reference}`,
        { headers: this.headers }
      );

      return response.data;
    } catch (error: any) {
      throw new AppError(
        error.response?.data?.message ||
          "Failed to verify Paystack transaction",
        error.response?.status || 500
      );
    }
  }

  /**
   * Create a refund
   */
  async createRefund(data: {
    transaction: string; // transaction reference
    amount?: number; // amount to refund in kobo
  }) {
    try {
      const response = await axios.post(`${this.baseUrl}/refund`, data, {
        headers: this.headers,
      });

      return response.data;
    } catch (error: any) {
      throw new AppError(
        error.response?.data?.message || "Failed to create Paystack refund",
        error.response?.status || 500
      );
    }
  }

  /**
   * Create a transfer recipient (for paying taskers)
   */
  async createTransferRecipient(data: {
    type: string; // nuban, mobile_money, basa
    name: string;
    account_number: string;
    bank_code: string;
    currency?: string;
  }) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/transferrecipient`,
        data,
        { headers: this.headers }
      );

      return response.data;
    } catch (error: any) {
      throw new AppError(
        error.response?.data?.message ||
          "Failed to create Paystack transfer recipient",
        error.response?.status || 500
      );
    }
  }

  /**
   * Initiate a transfer (for paying taskers)
   */
  async initiateTransfer(data: {
    source: string; // balance
    amount: number; // amount in kobo
    recipient: string; // recipient code
    reason?: string;
    reference?: string;
  }) {
    try {
      const response = await axios.post(`${this.baseUrl}/transfer`, data, {
        headers: this.headers,
      });

      return response.data;
    } catch (error: any) {
      throw new AppError(
        error.response?.data?.message || "Failed to initiate Paystack transfer",
        error.response?.status || 500
      );
    }
  }
}

export const paystackService = new PaystackService();
