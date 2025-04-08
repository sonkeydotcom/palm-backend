// modules/emails/messages/taskBooked.ts
export const taskBooked = (data: {
  name: string;
  taskName: string;
  date: string;
}) => ({
  subject: `🎉 Your task "${data.taskName}" is booked!`,
  text: `Hi ${data.name}, your task "${data.taskName}" has been successfully booked for ${data.date}.`,
  html: `
    <h2>Hello ${data.name},</h2>
    <p>Your task <strong>${data.taskName}</strong> is booked for <strong>${data.date}</strong>.</p>
    <p>Thanks for using Palm!</p>
  `,
});
