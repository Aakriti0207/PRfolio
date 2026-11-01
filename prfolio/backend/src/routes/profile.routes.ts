import { Router } from "express";
import { profile } from "../controllers/profile.controller";

export const profileRouter = Router();
profileRouter.get("/:slug", profile);
