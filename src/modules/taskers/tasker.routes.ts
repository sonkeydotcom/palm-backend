import express from "express";
import { taskerController } from "./tasker.controller";

const router = express.Router();

router.get("/", taskerController.getAllTaskers);

export default router;
