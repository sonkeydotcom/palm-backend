import Joi from "joi";
import {
  NewTasker,
  NewTaskerPortfolioItem,
  NewTaskerSkill,
} from "../modules/taskers/tasker.schema";

export const validateTasker = (data: NewTasker, isUpdate = false) => {
  const schema = Joi.object({
    userId: isUpdate
      ? Joi.number().integer()
      : Joi.number().integer().required(),
    headline: Joi.string().max(255),
    bio: Joi.string(),
    profilePhoto: Joi.string(),
    coverPhoto: Joi.string(),
    locationId: Joi.number().integer(),
    workRadius: Joi.number().integer().min(1),
    availability: Joi.object(),
    languages: Joi.array().items(Joi.string()),
    education: Joi.array().items(Joi.object()),
    workExperience: Joi.array().items(Joi.object()),
    responseRate: Joi.number().min(0).max(100),
    responseTime: Joi.number().integer().min(0),
    backgroundChecked: Joi.boolean(),
    identityVerified: Joi.boolean(),
    phoneVerified: Joi.boolean(),
    emailVerified: Joi.boolean(),
    isElite: Joi.boolean(),
    isActive: Joi.boolean(),
  });

  return schema.validate(data);
};

export const validateTaskerSkill = (data: NewTaskerSkill, isUpdate = false) => {
  const schema = Joi.object({
    serviceId: isUpdate
      ? Joi.number().integer()
      : Joi.number().integer().required(),
    hourlyRate: isUpdate
      ? Joi.number().integer().min(0)
      : Joi.number().integer().min(0).required(),
    quickPitch: Joi.string(),
    experience: Joi.string(),
    experienceYears: Joi.number().integer().min(0),
    hasEquipment: Joi.boolean(),
    equipmentDescription: Joi.string(),
    isQuickAssign: Joi.boolean(),
    isActive: Joi.boolean(),
  });

  return schema.validate(data);
};

export const validateTaskerPortfolioItem = (
  data: NewTaskerPortfolioItem,
  isUpdate = false
) => {
  const schema = Joi.object({
    serviceId: Joi.number().integer(),
    title: isUpdate ? Joi.string().max(255) : Joi.string().max(255).required(),
    description: Joi.string(),
    imageUrl: isUpdate ? Joi.string() : Joi.string().required(),
    displayOrder: Joi.number().integer().min(0),
  });

  return schema.validate(data);
};
