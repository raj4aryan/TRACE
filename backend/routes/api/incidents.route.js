import express from "express";
import { verifyJwt, verifyRole } from "../../middlewares/auth.middleware.js";
import { authorityOneRoles, authorityTwoRoles } from "../../config/authority.config.js";
import {
  crimeReportPostController,
  getNearbyReportsController
} from "../../controllers/crimereport.controller.js";
import {
  crimeReportGetController,
  crimeReportDetailsController,
  crimeReportUpdateController
} from "../../controllers/crimeverify.controller.js";
import crimeReportDeleteController from "../../controllers/admin_crimedelete.controller.js";
import { getMyReportsController, getMyReportDetailsController } from "../../controllers/myreports.controller.js";

const router = express.Router();

// Public: map displays only verified reports (controller must enforce this).
router.get("/nearby", getNearbyReportsController);

// Any authenticated account can create a report, preserving current behavior.
// Restrict to ["citizen"] with verifyRole if that is your desired policy.
router.post("/", verifyJwt, crimeReportPostController);

router.get(
  "/mine",
  verifyJwt,
  verifyRole(["citizen"], "My Reports"),
  getMyReportsController
);

router.get(
  "/mine/:incident_id",
  verifyJwt,
  verifyRole(["citizen"], "My Report Details"),
  getMyReportDetailsController
);

// Authority/admin: list pending reports.
router.get(
  "/pending",
  verifyJwt,
  verifyRole(authorityOneRoles, "Pending Reports"),
  crimeReportGetController
);

// Authority/admin: retrieve a reporter's contact details for review.
router.get(
  "/:incident_id/reporter",
  verifyJwt,
  verifyRole(authorityOneRoles, "Reporter Details"),
  crimeReportDetailsController
);

// Authority/admin: approve or reject a pending report.
router.patch(
  "/:incident_id/verification",
  verifyJwt,
  verifyRole(authorityOneRoles, "Update Report Status"),
  crimeReportUpdateController
);

// Admin only: delete an incident.
router.delete(
  "/:incident_id",
  verifyJwt,
  verifyRole(authorityTwoRoles, "Delete Reports"),
  crimeReportDeleteController
);

export default router;
