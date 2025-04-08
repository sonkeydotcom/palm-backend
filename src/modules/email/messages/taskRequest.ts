// modules/emails/messages/taskRequest.ts
export const taskRequest = (data: {
  name: string;
  task: string;
  time: string;
}) => ({
  subject: `🛠️ Task Request: ${data.task}`,
  text: `${data.name} requested a task "${data.task}" for ${data.time}`,
  html: `
    <p><strong>${data.name}</strong> requested a task:</p>
    <p><strong>${data.task}</strong> scheduled for ${data.time}</p>
  `,
});
