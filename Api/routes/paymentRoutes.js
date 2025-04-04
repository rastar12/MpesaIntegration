import express from "express";
import { generateAccessToken, home, stkPush, stkCallback } from "../controllers/paymentController.js";
//import { generateAccessToken, stkPush, stkCallback, home } from "../controllers/paymentController.js";

const router = express.Router();

router.get("/", home);
router.post("/api/stk/push", generateAccessToken, stkPush);
router.post("/api/stk/callback-handler", stkCallback);

export default router;