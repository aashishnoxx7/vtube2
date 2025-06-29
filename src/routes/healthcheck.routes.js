import express from "express";
const router = express.Router(); // ✅ Use express.Router, NOT the `router` package

import { healthCheck } from "../controllers/healthcheck.controllers.js";

router.get("/", healthCheck);

export default router;
