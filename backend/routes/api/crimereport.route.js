import {crimeReportPostController, getNearbyReportsController} from "../../controllers/crimereport.controller.js";
import express from "express"

const router = express.Router()

router.post("/", crimeReportPostController)
router.get("/nearby", getNearbyReportsController)

export default router