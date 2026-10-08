import { createUserController } from "../../controllers/userinformation.controller.js";
import express from "express"

const router = express.Router()

router.route("/")
    .post(createUserController)

export default router