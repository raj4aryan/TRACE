import UserInformationModel from "../models/users.model.js";
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"
import "dotenv/config"
import { systemLogger, adminLogger, authorityLogger } from "../utils/logger.js";

const getRoleLogger = (role) => {
    if (role === "admin") return adminLogger;
    if (role === "authority") return authorityLogger;
    return systemLogger; // Fallback for citizens
};

const loginController = async(req, res) => {
    try {
        //1. check if its a valid request
        if(!req?.body || Object.keys(req.body).length === 0){
            return res.status(400).json({error: "Invalid Request: Empty body"})
        }
        const {email, password} = req.body

        //2. Check if email and password are valid
        if(!email || !password){
            return res.status(400).json({error: "Invalid Credentials"})
        }

        //3. check if email exists
        const fetchedUser = await UserInformationModel.findOne({email: email.toLowerCase()})
        if(!fetchedUser){
            return res.status(401).json({error: "Invalid Credentials"})
        }
        const roleLogger = getRoleLogger(fetchedUser.role);

        //4. Check for password
        const isPasswordValid = await bcrypt.compare(password, fetchedUser.password)
        if(!isPasswordValid){
            return res.status(401).json({error: "Invalid Credentials"})
        }

        //4. User is valid, so generate a jwt token and send it.
        const jwt_payload = {
            user_id: fetchedUser._id,
            alias_name: fetchedUser.alias_name,
            role: fetchedUser.role
        }
        const jwt_token = jwt.sign(jwt_payload, process.env.JWT_SECRET_KEY, {expiresIn: "2h"})

        // Set the HTTP-Only cookie
        res.cookie("trace_token", jwt_token, {
            httpOnly: true,  // PREVENTS XSS: JavaScript cannot read this cookie
            secure: process.env.NODE_ENV === "production", // True in production (requires HTTPS)
            sameSite: "strict", // PREVENTS CSRF: Cookie is only sent for same-site requests
            maxAge: 2 * 60 * 60 * 1000 // 2 hours in milliseconds
        });

        // console.log(jwt_token)    ----DELETE

        roleLogger.info(`User logged-in successfully, user_id: ${fetchedUser._id} & alias_name: ${fetchedUser.alias_name}`);

        return res.status(200).json({
            message: "Login Successfull",
            user: {
                user_name: fetchedUser.user_name,
                alias_name: fetchedUser.alias_name
            }
        })


    } catch (error) {
        systemLogger.error(`Failed to login user: ${error.message}\nStack: ${error.stack}`);
        return res.status(500).json({error: "Internal server error"})
    }
}

export default loginController