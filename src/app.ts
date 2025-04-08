import express from "express";
import logger from "./common/config/logger";
import {
  errorHandler,
  notFoundHandler,
} from "./common/middleware/error.middleware";
import cookieParser from "cookie-parser";
import routes from "./routes/index.routes";

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(logger);

app.use("/api", routes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
