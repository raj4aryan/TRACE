import UserInformationModel from "../models/users.model.js";
import { validPossibleRoles } from "../config/authority.config.js";
import { adminLogger } from "../utils/logger.js";

const updateUserRoleController = async (req, res) => {
    try {
        //1. Check for valid request
        if(!req?.body || Object.keys(req.body).length === 0){
            return res.status(400).json({error: "Invalid Request"})
        }
        const {target_email, requested_role} = req.body
        //2. Check for email and requested role
        if(!target_email || !validPossibleRoles.includes(requested_role)){
            return res.status(400).json({error: "Invalid Role Request"})
        }

        //3. Find the user and update
        const updatedUser = await UserInformationModel.findOneAndUpdate(
            {email: target_email},
            {$set: {role: requested_role}},
            {returnDocument: "after"}
        )
        if (!updatedUser) {
            return res.status(404).json({ error: "User not found" });
        }

        adminLogger.info(`Admin: ${req.user.alias_name} changed role of: ${updatedUser.alias_name} to ${requested_role}`);
        
        return res.status(200).json({
            success: `User ${updatedUser.alias_name} successfully set as ${requested_role}`,
            user: {
                alias_name: updatedUser.alias_name,
                role: updatedUser.role
            }
        });

    } catch (error) {
        adminLogger.error(`Failed to update role\nError: ${error.message}\nStack: ${error.stack}`);
        return res.status(500).json({ error: "Internal Server Error" });
    }
};

export default updateUserRoleController;