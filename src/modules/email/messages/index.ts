// modules/emails/messages/index.ts

import { otp } from "./otp";
import { taskBooked } from "./taskBooked";
import { taskRequest } from "./taskRequest";
import { welcome } from "./welcome";

export const EmailMessages = {
  taskBooked,
  welcome,
  otp,
  taskRequest,
  // Add more here...
};

export type EmailMessageKey = keyof typeof EmailMessages;
