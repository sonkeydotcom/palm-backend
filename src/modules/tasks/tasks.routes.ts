import express from "express";
import { taskController } from "./task.controller";

const router = express.Router();

router.get("/", taskController.getAllTasks);
router.get("/:id", taskController.getTaskById);

export default router;
