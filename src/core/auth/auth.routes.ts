import { Router } from "express";
import { authController } from "./auth.controller";

const router = Router();

// Auth routes here

router.post("/sign-in", authController.login);

router.post("/sign-up", authController.register);

export default router;
