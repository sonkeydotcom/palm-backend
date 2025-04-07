import { Router } from "express";
import auth from "../modules/auth/auth.routes";
import tasks from "../modules/tasks/tasks.routes";
import category from "../modules/service-categories/category.routes";
import taskers from "../modules/taskers/tasker.routes";

const router = Router();

// Add routes here
router.get("/", (req, res) => {
  res.json({ message: "Hello, World!" });
});
router.use("/auth", auth);
router.use("/tasks", tasks);
router.use("/service-categories", category);
router.use("taskers", taskers);

export default router;
