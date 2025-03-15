import Joi from "joi";
import { Category } from "../modules/categories/category.schema";
import { Task } from "../modules/tasks/task.schema";

export const validateTaskCategory = (data: Category, isUpdate = false) => {
  const schema = Joi.object({
    name: isUpdate
      ? Joi.string().min(2).max(100)
      : Joi.string().min(2).max(100).required(),
    description: Joi.string(),
    icon: Joi.string(),
    slug: Joi.string().min(2).max(100),
    parentId: Joi.number().integer().allow(null),
    displayOrder: Joi.number().integer().min(0),
    isActive: Joi.boolean(),
  });

  return schema.validate(data);
};

export const validateTask = (data: Task, isUpdate = false) => {
  const schema = Joi.object({
    name: isUpdate
      ? Joi.string().min(2).max(255)
      : Joi.string().min(2).max(255).required(),
    description: Joi.string(),
    shortDescription: Joi.string().max(500),
    categoryId: isUpdate
      ? Joi.number().integer()
      : Joi.number().integer().required(),
    baseHourlyRate: Joi.number().integer().min(0),
    estimatedDuration: Joi.number().integer().min(1),
    image: Joi.string(),
    gallery: Joi.array().items(Joi.string()),
    tags: Joi.array().items(Joi.string()),
    requiredEquipment: Joi.array().items(Joi.string()),
    requiredSkills: Joi.array().items(Joi.string()),
    isPopular: Joi.boolean(),
    isFeatured: Joi.boolean(),
    slug: Joi.string().min(2).max(255),
    metadata: Joi.object(),
    isActive: Joi.boolean(),

    // Related data
    questions: Joi.array().items(
      Joi.alternatives().try(
        // For creating new questions
        Joi.object({
          question: Joi.string().required(),
          type: Joi.string()
            .valid("text", "number", "boolean", "select", "date", "time")
            .required(),
          options: Joi.when("type", {
            is: "select",
            then: Joi.array().items(Joi.string()).required(),
            otherwise: Joi.array().items(Joi.string()).optional(),
          }),
          isRequired: Joi.boolean(),
          displayOrder: Joi.number().integer().min(0),
        }),
        // For updating existing questions
        Joi.object({
          id: Joi.number().integer().required(),
          question: Joi.string(),
          type: Joi.string().valid(
            "text",
            "number",
            "boolean",
            "select",
            "date",
            "time"
          ),
          options: Joi.array().items(Joi.string()),
          isRequired: Joi.boolean(),
          displayOrder: Joi.number().integer().min(0),
        })
      )
    ),

    faqs: Joi.array().items(
      Joi.alternatives().try(
        // For creating new FAQs
        Joi.object({
          question: Joi.string().required(),
          answer: Joi.string().required(),
          displayOrder: Joi.number().integer().min(0),
        }),
        // For updating existing FAQs
        Joi.object({
          id: Joi.number().integer().required(),
          question: Joi.string(),
          answer: Joi.string(),
          displayOrder: Joi.number().integer().min(0),
        })
      )
    ),
  });

  return schema.validate(data);
};
