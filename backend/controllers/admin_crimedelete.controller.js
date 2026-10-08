import CrimeReportModel from "../models/crimereport.model.js";
import { adminLogger } from "../utils/logger.js"; // Make sure to import your logger

const crimeReportDeleteController = async (req, res) => {
    try {
        // 1. Extract from URL params instead of body
        const { incident_id } = req.params;

        if (!incident_id) {
            return res.status(400).json({ error: "Invalid Request: incident_id is required" });
        }

        // 2. Use findOneAndDelete for custom fields
        const deletedData = await CrimeReportModel.findOneAndDelete({ incident_id });

        // 3. Handle the case where the report doesn't exist
        if (!deletedData) {
            return res.status(404).json({ error: "Report not found or already deleted" });
        }

        // 4. Log the access info and return (Fixed typo and object logging)
        adminLogger.info(`User: ${req.user.alias_name} deleted Report: ${deletedData.incident_id}`);
        
        return res.status(200).json({
            success: `INCIDENT: ${deletedData.incident_id} deleted successfully`
        });

    } catch (error) {
        adminLogger.error(`User: ${req.user.alias_name} failed to delete Report\nError: ${error.message}\nStack: ${error.stack}`);
        return res.status(500).json({ error: "Internal Server Error" });
    }
};

export default crimeReportDeleteController;