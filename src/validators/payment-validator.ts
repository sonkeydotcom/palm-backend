import Joi from "joi";

export const validatePayment = (data: any) => {
  const schema = Joi.object({
    bookingId: Joi.number().integer().required(),
    userId: Joi.number().integer().required(),
    providerId: Joi.number().integer().required(),
    amount: Joi.number().integer().min(1).required(),
    currency: Joi.string().length(3).default("USD"),
    paymentMethod: Joi.string().required(),
    paymentMethodDetails: Joi.object().optional(),
    status: Joi.string()
      .valid("pending", "processing", "succeeded", "failed", "refunded")
      .default("pending"),
    transactionId: Joi.string().optional(),
    paymentIntentId: Joi.string().optional(),
    feeAmount: Joi.number().integer().min(0).optional(),
    netAmount: Joi.number().integer().min(0).optional(),
    metadata: Joi.object().optional(),
    receiptUrl: Joi.string().uri().optional(),
    errorMessage: Joi.string().optional(),
  });

  return schema.validate(data);
};

export const validatePaymentMethod = (data: any) => {
  const schema = Joi.object({
    userId: Joi.number().integer().required(),
    type: Joi.string().required(),
    isDefault: Joi.boolean().default(false),
    nickname: Joi.string().max(100).optional(),
    // For credit cards
    last4: Joi.string().length(4).optional(),
    brand: Joi.string().max(50).optional(),
    expiryMonth: Joi.number().integer().min(1).max(12).optional(),
    expiryYear: Joi.number().integer().min(new Date().getFullYear()).optional(),
    // For bank accounts
    bankName: Joi.string().max(100).optional(),
    accountLast4: Joi.string().length(4).optional(),
    // External payment method IDs
    externalId: Joi.string().max(255).optional(),
    // Status
    status: Joi.string().valid("active", "inactive").default("active"),
  });

  return schema.validate(data);
};
