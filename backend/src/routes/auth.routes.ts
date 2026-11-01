import { Router } from "express";
import { finishOAuth, logout, me, startOAuth } from "../controllers/auth.controller";
import { requireAuth } from "../middleware/auth.middleware";
import { authRateLimit } from "../middleware/rate-limit.middleware";
import { requireTrustedOrigin } from "../middleware/csrf.middleware";

export const authRouter = Router();
authRouter.get("/github", authRateLimit, startOAuth);
authRouter.get("/github/callback", authRateLimit, finishOAuth);
authRouter.get("/me", requireAuth, me);
authRouter.post("/logout", requireTrustedOrigin, requireAuth, logout);
