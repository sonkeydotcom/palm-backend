import Joi from "joi";
import {
  verificationStatuses,
  verificationTypes,
} from "../modules/verifications/verification.schema";

export const validateVerification = (data: any) => {
  const schema = Joi.object({
    taskerId: Joi.number().integer().required(),
    userId: Joi.number().integer().required(),
    type: Joi.string()
      .valid(...verificationTypes)
      .required(),
    identifier: Joi.string().max(50).required(),
    documentFront: Joi.string().uri().required(),
    documentBack: Joi.string().uri(),
    selfieWithDocument: Joi.string().uri(),
    metadata: Joi.object().optional(),
    verificationProvider: Joi.string().max(50).optional(),
    verificationReference: Joi.string().max(100).optional(),
  });

  return schema.validate(data);
};

export const validateVerificationStatus = (data: any) => {
  const schema = Joi.object({
    status: Joi.string()
      .valid(...verificationStatuses)
      .required(),
    message: Joi.string().optional(),
    rejectionReason: Joi.when("status", {
      is: "rejected",
      then: Joi.string().required(),
      otherwise: Joi.string().optional(),
    }),
    metadata: Joi.object().optional(),
  });

  return schema.validate(data);
};

export const validateBVNVerification = (data: any) => {
  const schema = Joi.object({
    bvn: Joi.string()
      .pattern(/^\d{11}$/)
      .required()
      .messages({
        "string.pattern.base": "BVN must be 11 digits",
      }),
    firstName: Joi.string().required(),
    lastName: Joi.string().required(),
    dateOfBirth: Joi.string().optional(),
    phoneNumber: Joi.string().optional(),
  });

  return schema.validate(data);
};

export const validateNINVerification = (data: any) => {
  const schema = Joi.object({
    nin: Joi.string()
      .pattern(/^\d{11}$/)
      .required()
      .messages({
        "string.pattern.base": "NIN must be 11 digits",
      }),
    firstName: Joi.string().required(),
    lastName: Joi.string().required(),
    dateOfBirth: Joi.string().optional(),
    phoneNumber: Joi.string().optional(),
  });

  return schema.validate(data);
};
