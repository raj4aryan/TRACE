import logoutController from "../../controllers/logout.controller.js";
import express from "express"

const router = express.Router()

router.post("/", logoutController)

export default router