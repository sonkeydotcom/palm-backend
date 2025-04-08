import nodemailer from "nodemailer";
import { SMTP_HOST, SMTP_PASS, SMTP_PORT, SMTP_USER } from "./env";

export const transporter = () => {
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: false, // true for port 465, false for other ports
    auth: {
      user: SMTP_USER as string,
      pass: SMTP_PASS as string,
    },
  } as nodemailer.TransportOptions);
};
