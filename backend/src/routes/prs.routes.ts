import { Router } from "express";
import { getOne, list, stats, update } from "../controllers/prs.controller";
import { requireAuth } from "../middleware/auth.middleware";
import { requireTrustedOrigin } from "../middleware/csrf.middleware";

export const prsRouter = Router();
prsRouter.use(requireAuth);
prsRouter.get("/", list);
prsRouter.get("/stats", stats);
prsRouter.get("/:id", getOne);
prsRouter.patch("/:id", requireTrustedOrigin, update);
