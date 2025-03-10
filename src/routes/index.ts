import { Router } from "express";

const router = Router();

// Add routes here

router.get("/", (req, res) => {
  res.json({ message: "Hello, World!" });
});

export default router;
