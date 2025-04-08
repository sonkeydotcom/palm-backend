// modules/emails/messages/otp.ts
export const otp = (data: { code: string }) => ({
  subject: "🔐 Your OTP Code",
  text: `Use this code to verify your account: ${data.code}`,
  html: `
    <h2>Your OTP Code</h2>
    <p><strong>${data.code}</strong></p>
    <p>Use this to verify your account.</p>
  `,
});
