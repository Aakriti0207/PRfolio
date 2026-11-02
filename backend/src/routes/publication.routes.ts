import { Router } from "express";
import { updatePublication } from "../controllers/publication.controller";
import { requireAuth } from "../middleware/auth.middleware";
import { requireTrustedOrigin } from "../middleware/csrf.middleware";

export const publicationRouter = Router();
publicationRouter.patch("/", requireAuth, requireTrustedOrigin, updatePublication);
