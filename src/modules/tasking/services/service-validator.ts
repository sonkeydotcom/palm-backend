import Joi from "joi";

export const validateServiceCategory = (data: any, isUpdate = false) => {
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

export const validateService = (data: any, isUpdate = false) => {
  const schema = Joi.object({
    name: isUpdate
      ? Joi.string().min(2).max(255)
      : Joi.string().min(2).max(255).required(),
    description: Joi.string(),
    shortDescription: Joi.string().max(500),
    categoryId: isUpdate
      ? Joi.number().integer()
      : Joi.number().integer().required(),
    basePrice: Joi.number().integer().min(0),
    pricingType: Joi.string()
      .valid("fixed", "hourly", "quote")
      .default("fixed"),
    pricingOptions: Joi.object(),
    duration: Joi.number().integer().min(1),
    durationUnit: Joi.string()
      .valid("minutes", "hours", "days")
      .default("minutes"),
    image: Joi.string(),
    gallery: Joi.array().items(Joi.string()),
    tags: Joi.array().items(Joi.string()),
    customFields: Joi.object(),
    isPopular: Joi.boolean(),
    isFeatured: Joi.boolean(),
    slug: Joi.string().min(2).max(255),
    metadata: Joi.object(),
    isActive: Joi.boolean(),

    // Related data
    attributes: Joi.array().items(
      Joi.object({
        attributeId: Joi.number().integer().required(),
        value: Joi.string().required(),
      })
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

export const validateServiceAttribute = (data: any, isUpdate = false) => {
  const schema = Joi.object({
    name: isUpdate
      ? Joi.string().min(2).max(100)
      : Joi.string().min(2).max(100).required(),
    type: isUpdate
      ? Joi.string().valid("text", "number", "boolean", "select")
      : Joi.string().valid("text", "number", "boolean", "select").required(),
    options: Joi.array().items(Joi.string()),
    isRequired: Joi.boolean(),
    displayOrder: Joi.number().integer().min(0),
  });

  return schema.validate(data);
};
