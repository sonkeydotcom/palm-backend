import { SentMessageInfo } from "nodemailer";
import { transporter } from "../../common/config/email";
import { SMTP_USER } from "../../common/config/env";
import { EmailPayload } from "./types";
import { EmailMessageKey, EmailMessages } from "./messages";

export class EmailService {
  private from = SMTP_USER;

  // Send raw email manually
  async send({
    to,
    subject,
    body,
    htmlBody,
  }: EmailPayload): Promise<SentMessageInfo> {
    const info = await transporter().sendMail({
      from: this.from,
      to,
      subject,
      text: body,
      html: htmlBody,
    });

    return info; // 🔥 important — avoids TS error
  }

  // Send predefined message
  async sendTemplate<T>(
    to: string,
    templateKey: EmailMessageKey,
    data: T
  ): Promise<SentMessageInfo> {
    const template = EmailMessages[templateKey] as (data: T) => {
      subject: string;
      text: string;
      html: string;
    };

    const { subject, text, html } = template(data);

    const info = await transporter().sendMail({
      from: this.from,
      to,
      subject,
      text,
      html,
    });

    return info;
  }
}

export const emailService = new EmailService();
