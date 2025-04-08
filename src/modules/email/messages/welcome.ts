// modules/emails/messages/welcome.ts
export const welcome = (data: { name: string }) => ({
  subject: "👋 Welcome to Palm!",
  text: `Hi ${data.name}, welcome to Palm! We’re glad to have you.`,
  html: `
    <h1>Welcome, ${data.name}!</h1>
    <p>Thanks for joining Palm. We’re excited to help you get things done.</p>
  `,
});
