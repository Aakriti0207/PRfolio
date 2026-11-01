import { Router } from "express";
import { sync } from "../controllers/github.controller";
import { requireAuth } from "../middleware/auth.middleware";
import { requireTrustedOrigin } from "../middleware/csrf.middleware";

export const githubRouter = Router();
githubRouter.post("/sync", requireTrustedOrigin, requireAuth, sync);
