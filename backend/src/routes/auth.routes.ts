import { Router } from "express";

import { loginAdmin } from "../controllers/auth.controller";

const authRouter = Router();

authRouter.post("/login", loginAdmin);

export { authRouter };
