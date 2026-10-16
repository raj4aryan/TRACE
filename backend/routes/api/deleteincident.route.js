import crimeReportDeleteController from "../../controllers/admin_crimedelete.controller.js";
import express from "express"

const router = express.Router()
router.delete('/:incident_id', crimeReportDeleteController);

export default router