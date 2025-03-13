import { Router } from "express";
import { authController } from "./auth.controller";

const router = Router();

// Auth routes here

router.post("/users", authController.login);

router.post("/register", authController.register);

export default router;
