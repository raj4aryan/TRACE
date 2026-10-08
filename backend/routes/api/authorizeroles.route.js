import express from "express"
import updateUserRoleController from "../../controllers/admin_userroles.controller.js"

const router = express.Router()

router.patch("/", updateUserRoleController)

export default router