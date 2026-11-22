import express from "express";
import * as authController from "../controllers/auth.controller.ts";
import { authenticate } from "../middleware/authenticate.ts";
import { validateBody } from "../middleware/validate.ts";
import {
  RegisterSchema,
  LoginSchema,
  RefreshSchema,
} from "../validators/auth.validator.ts";

const router = express.Router();

router.post("/register", validateBody(RegisterSchema), authController.register);
router.post("/login", validateBody(LoginSchema), authController.login);
router.post("/refresh", validateBody(RefreshSchema), authController.refresh);
router.post("/logout", authenticate, authController.logout);
router.get("/me", authenticate, authController.me);

export default router;
