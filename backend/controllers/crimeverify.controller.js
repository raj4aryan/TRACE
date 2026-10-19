import CrimeReportModel from "../models/crimereport.model.js";
import UserModel from "../models/users.model.js"; // adjust the import name if your users model exports differently
import { adminLogger, authorityLogger } from "../utils/logger.js";

// Helper function to route logs
const getRoleLogger = (role) => {
    if (role === "admin") return adminLogger;
    else return authorityLogger;
};

const DECISIONS = ["Verified", "Rejected"];

// Contact details an authority needs, and nothing more. The password is never selected or sent.
const REPORTER_FIELDS = "user_name alias_name email phone_number";

const crimeReportGetController = async (req, res) => {
    const roleLogger = getRoleLogger(req?.user?.role);
    try {
        //1. Fetch the data, newest first
        const fetchedData = await CrimeReportModel.find({
            verification_status: "Pending"
        }).sort({ createdAt: -1 }).lean();

        //2. Log the access info and return
        roleLogger.info(`User: ${req.user.alias_name} successfully fetched ${fetchedData.length} pending reports`);
        return res.status(200).json({
            pendingReports: fetchedData
        })

    } catch (error) {
        roleLogger.error(`Failed to fetch pending reports\nError: ${error.message}\nStack: ${error.stack}`);
        return res.status(500).json({error: "Internal Server Error"})
    }
}

// GET /api/incidents/:incident_id/reporter -> the reporter behind a report, so an authority can contact them.
const crimeReportDetailsController = async (req, res) => {
    const roleLogger = getRoleLogger(req?.user?.role);
    try {
        const { incident_id } = req.params;
        if (!incident_id) return res.status(400).json({ error: "Missing required parameter: incident_id" });

        const report = await CrimeReportModel.findOne({ incident_id }).select("reported_by_alias").lean();
        if (!report) return res.status(404).json({ error: "Report not found" });

        // Official FIR and news-scrape reports may have no registered account behind them.
        const user = await UserModel.findOne({ alias_name: report.reported_by_alias }).select(REPORTER_FIELDS).lean();

        roleLogger.info(`User: ${req.user.alias_name} viewed reporter details for ${incident_id}`);
        res.set("Cache-Control", "no-store");
        return res.status(200).json({
            reporter: user ? {
                alias_name: user.alias_name,
                user_name: user.user_name,
                email: user.email,
                phone_number: user.phone_number
            } : null
        });
    } catch (error) {
        roleLogger.error(`Failed to fetch report details\nError: ${error.message}\nStack: ${error.stack}`);
        return res.status(500).json({ error: "Internal Server Error" });
    }
};

// PATCH /api/incidents/:incident_id/verification  { decision: "Verified" | "Rejected", note? }
// With no body it still verifies, so older clients keep working.
const crimeReportUpdateController = async (req, res) => {
    const roleLogger = getRoleLogger(req?.user?.role);

    try {
        const { incident_id } = req.params;
        if (!incident_id) {
            return res.status(400).json({ error: "Missing required parameter: incident_id" });
        }

        const decision = req.body?.decision ?? "Verified";
        if (!DECISIONS.includes(decision)) {
            return res.status(400).json({ error: `decision must be one of: ${DECISIONS.join(", ")}` });
        }
        const note = typeof req.body?.note === "string" ? req.body.note.trim() : "";
        if (note.length > 300) return res.status(400).json({ error: "note must be 300 characters or fewer" });

        // Only a Pending report can be decided, so two authorities can't overwrite each other.
        const updatedData = await CrimeReportModel.findOneAndUpdate(
            { incident_id, verification_status: "Pending" },
            { $set: {
                verification_status: decision,
                reviewed_by_alias: req.user.alias_name,
                reviewed_at: new Date(),
                review_note: note || undefined
            } },
            { returnDocument: "after" }
        );

        if (!updatedData) {
            const existing = await CrimeReportModel.findOne({ incident_id }).select("verification_status").lean();
            if (!existing) return res.status(404).json({ error: "Report not found" });
            return res.status(409).json({ error: `Report was already ${existing.verification_status}` });
        }

        roleLogger.info(`User: ${req.user.alias_name} set report ${updatedData.incident_id} to ${decision}`);

        return res.status(200).json({
            success: `Report ${decision.toLowerCase()} successfully`,
            incident_id: updatedData.incident_id,
            verification_status: updatedData.verification_status
        });

    } catch (error) {
        roleLogger.error(`Failed to update report\nError: ${error.message}\nStack: ${error.stack}`);
        return res.status(500).json({ error: "Internal Server Error" });
    }
};

export {
    crimeReportGetController,
    crimeReportUpdateController,
    crimeReportDetailsController
}