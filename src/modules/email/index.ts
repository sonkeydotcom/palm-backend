// modules/emails/messages/index.ts

import { taskBooked } from "./messages/taskBooked";

export const EmailMessages = {
  taskBooked,
  //   taskAccepted,
  // Add more here...
};

export type EmailMessageKey = keyof typeof EmailMessages;
