import crimeReportDeleteController from "../../controllers/admin_crimedelete.controller.js";
import {crimeReportGetController, crimeReportUpdateController } from "../../controllers/crimeverify.controller.js";
import express from "express"


const router = express.Router()

// router.route('/')
//     .get(crimeReportGetController)
//     .delete(crimeReportDeleteController)

// Get all pending reports
router.get('/', crimeReportGetController);

// Delete a specific report via URL parameter
router.delete('/:incident_id', crimeReportDeleteController);
router.patch('/:incident_id', crimeReportUpdateController);


export default router