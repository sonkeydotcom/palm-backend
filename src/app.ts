import express, { Response } from "express";
import logger from "./config/logger";
import { errorHandler, notFoundHandler } from "./middleware/error.middleware";
import cookieParser from "cookie-parser";

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(logger);

app.use(notFoundHandler);
app.use(errorHandler);

app.get("/", (req, res: Response) => {
  res.json({ message: "Hello, World!" });
});

export default app;
