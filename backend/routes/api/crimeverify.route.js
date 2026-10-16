import {crimeReportGetController, crimeReportDetailsController, crimeReportUpdateController } from "../../controllers/crimeverify.controller.js";
import express from "express"


const router = express.Router()

// router.route('/')
//     .get(crimeReportGetController)
//     .delete(crimeReportDeleteController)

// Get all pending reports
router.get('/', crimeReportGetController);

router.get("/:incident_id", crimeReportDetailsController);
// router.post("/:incident_id", crimeReportRevealAadhaarController);

// Delete a specific report via URL parameter
router.patch('/:incident_id', crimeReportUpdateController);

export default router