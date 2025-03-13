import { Router } from "express";
import auth from "../modules/auth/auth.routes";

const router = Router();

// Add routes here

router.get("/", (req, res) => {
  res.json({ message: "Hello, World!" });
});

router.use("/auth", auth);

export default router;
