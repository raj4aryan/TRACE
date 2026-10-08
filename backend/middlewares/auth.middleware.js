import jwt from "jsonwebtoken"
import { systemLogger, adminLogger, authorityLogger } from "../utils/logger.js";
import "dotenv/config"


// Dynamically Select the Logger in Middleware
// Helper function to route logs
const getRoleLogger = (role) => {
    if (role === "admin") return adminLogger;
    if (role === "authority") return authorityLogger;
    return systemLogger; // Fallback for citizens
};

// AUTHENTICATION

const verifyJwt = async (req, res, next) => {
    try {
        //1. check for request
        if(!req?.cookies?.trace_token){
            return res.status(400).json({error: "Empty Request"})
        }
        
        //2. extract the token and check its existence
        const token = req.cookies.trace_token

        //3. verify the token with the secret key
        const verifiedData = jwt.verify(token, process.env.JWT_SECRET_KEY)

        // if(!verifiedData){} -- no need
        /*
        jwt.verify() does not return a boolean. If the token is valid, it returns the DECODED PAYLOAD OBJECT that you originally packed into the token when you signed it. If the token is invalid, tampered with, or expired, it doesn't return false—it throws an error, which is why that line must be wrapped inside a try...catch block.
        */
        
        //4. append the information and then move forward
        req.user = verifiedData
        // console.log("User authenticated with jwt!")    ----DELETE
        
        systemLogger.info(`User Authenticated: ${req.user.alias_name}`);

        next()
        
    } catch (error) {
        systemLogger.error(`Failed to authenticate user: ${error.message}\nStack: ${error.stack}`);
        return res.status(401).json({error: "Invalid or expired token"})
    }
}


// AUTHORISATION

const verifyRole = (allowedRoles, service) => {
    return async (req, res, next) => {
        // Select the specific logger for this user's role
        const roleLogger = getRoleLogger(req?.user?.role);
        try {
            if(!req?.user?.role){
                return res.status(403).json({error: "Forbidden: Access Denied!"})
            }
        
            if(!allowedRoles.includes(req.user.role)){
                return res.status(403).json({ 
                    error: `Forbidden: Your role (${req.user.role}) is not authorized to access this resource` 
                });
            }
            roleLogger.info(`User: ${req.user.alias_name} with Role: ${req.user.role} Accessed service: ${service}`)
            next()
            
        } catch (error) {
            roleLogger.error(`Role verification failed for service: ${service}\nError: ${error.message}\nStack: ${error.stack}`);
            return res.status(500).json({error: "Internal Server Error"})
        }
    }
}


export {verifyJwt, verifyRole}