import CrimeReportModel from "../models/crimereport.model.js";
import {adminLogger, authorityLogger} from "../utils/logger.js";

// Helper function to route logs
const getRoleLogger = (role) => {
    if (role === "admin") return adminLogger;
    else return authorityLogger;
};

const crimeReportGetController = async (req, res) => {
    const roleLogger = getRoleLogger(req?.user?.role);
    try {
        //1. Check for user info -- NO NEED, ALREADY DONE IN AUTHORIZATION
        // if(!req?.user?.role){
        //     return res.status(400).json({error: "Forbidden: Access Denied"})
        // }

        //2. Fetch the data
        const fetchedData = await CrimeReportModel.find({
            verification_status: "Pending"
        })

        //3. Log the access info and return
        // The middleware already logged the access, but you can log the result count here
        roleLogger.info(`User: ${req.user.alias_name} successfully fetched ${fetchedData.length} pending reports`);
        return res.status(200).json({
            pendingReports: fetchedData
        })

    } catch (error) {
        roleLogger.error(`Failed to fetch pending reports\nError: ${error.message}\nStack: ${error.stack}`);
        return res.status(500).json({error: "Internal Server Error"})
    }
}

const crimeReportUpdateController = async (req, res) => {
    const roleLogger = getRoleLogger(req?.user?.role);
    
    try {
        // 1. Extract from URL params
        const { incident_id } = req.params;

        if (!incident_id) {
            return res.status(400).json({ error: "Missing required parameter: incident_id" });
        }

        // 2. Use findOneAndUpdate and the updated returnDocument syntax
        const updatedData = await CrimeReportModel.findOneAndUpdate(
            { incident_id: incident_id },
            { $set: { verification_status: "Verified" } },
            { returnDocument: "after" }
        );

        // 3. Handle non-existent reports
        if (!updatedData) {
            return res.status(404).json({ error: "Report not found" });
        }

        // 4. Corrected logging message (no .length on a single object)
        roleLogger.info(`User: ${req.user.alias_name} successfully verified report: ${updatedData.incident_id}`);
        
        return res.status(200).json({
            success: "Report verified successfully",
            incident_id: updatedData.incident_id,
            verification_status: updatedData.verification_status
        });
        
    } catch (error) {
        roleLogger.error(`Failed to verify report\nError: ${error.message}\nStack: ${error.stack}`);
        return res.status(500).json({ error: "Internal Server Error" });        
    }
};

export {crimeReportGetController, crimeReportUpdateController}