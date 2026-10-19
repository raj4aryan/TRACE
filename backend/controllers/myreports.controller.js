import CrimeReportModel from "../models/crimereport.model.js";
import systemLogger from "../utils/logger.js";

const getMyReportsController = async (req, res) => {
    try {
        if(!req.user?.alias_name){
            return res.status(401).json({error:"Authentication required!"})
        }
        const reports = await CrimeReportModel.find({
            reported_by_alias: req.user.alias_name
        })
        .select(`incident_id crime_category verification_status description incident_time createdAt location`)
        .sort({'createdAt': -1})
        .lean()

        res.set("Cache-Control", "no-store")
        return res.status(200).json({reports})

    } catch (error) {
        systemLogger.error(`Failed to fetch reports: ${error.message}`)
        return res.status(500).json({
            error: "Failed to fetch reports"
        });
    }
}

const getMyReportDetailsController = async (req, res) => {
    try {
        if(!req?.params?.incident_id || !req.user?.alias_name){
            return res.status(400).json({ error: "Missing incident_id" })
        }
        const incident = await CrimeReportModel.findOne({
            incident_id: req.params.incident_id,
            reported_by_alias: req.user.alias_name
        })
        .select(
            "incident_id crime_category description " +
            "verification_status incident_time createdAt " +
            "location address location_type ipc_section reviewed_at"
        )
        .lean();

        if(!incident) {
            return res.status(404).json({
                error: "Report not found"
            });
        }

        res.set("Cache-Control", "no-store");
        return res.status(200).json({ incident });

    } catch (error) {
        systemLogger.error(`Failed to fetch report: ${error.message}`)
        return res.status(500).json({
            error: "Failed to fetch report"
        });
        
    }
}

export { getMyReportsController, getMyReportDetailsController }