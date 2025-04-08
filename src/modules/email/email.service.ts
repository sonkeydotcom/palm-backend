import { SentMessageInfo } from "nodemailer";
import { transporter } from "../../config/email";
import { SMTP_USER } from "../../config/env";
import { EmailPayload } from "./types";
export class EmailService {
  //   private transporter = transporter();

  mailOptions = {
    from: SMTP_USER,
    to: "",
    subject: "",
    text: "",
    html: "",
  };

  async send({
    to,
    subject,
    body,
    htmlBody,
  }: EmailPayload): Promise<SentMessageInfo> {
    const info = await transporter().sendMail({
      from: this.mailOptions.from,
      to,
      subject,
      text: body,
      html: htmlBody,
    });
    console.log(info);
    return info;
  }
}

export const emailService = new EmailService();
