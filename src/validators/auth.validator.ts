import Joi from "joi";
import { User } from "../modules/users/user.schema";

export const validateLogin = (data: User) => {
  const schema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
  });

  return schema.validate(data);
};

export const validateRegister = (data: User) => {
  const schema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
    firstName: Joi.string().min(2).max(50),
    lastName: Joi.string().min(2).max(50),
    phone: Joi.string().pattern(/^[0-9+\-\s()]{8,20}$/),
    role: Joi.string().valid("customer", "provider").default("customer"),
  });

  return schema.validate(data);
};
