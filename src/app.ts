import express, { Response } from "express";
import logger from "./config/logger";

const app = express();
app.use(express.json());
app.use(logger);

app.get("/", (req, res: Response) => {
  res.json({ message: "Hello, World!" });
});

export default app;
