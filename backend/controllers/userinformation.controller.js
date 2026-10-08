import UserInformationModel from "../models/users.model.js"
import systemLogger from "../utils/logger.js"
import crypto from "crypto"
import bcrypt from "bcrypt"

const createUserController = async (req, res) => {
    try {
        //1. Check for request and the body
        if (!req?.body || Object.keys(req.body).length === 0) {
            return res.status(400).json({ error: "Invalid Request: Empty body" });
        }

        //2. Check for required fields
        const {user_name, password, phone_number, email, aadhaar_id} = req.body
        if(!user_name || !phone_number || !email || !aadhaar_id){
            return res.status(400).json({error: "Missing Required Fields"})
        }

        // Check if each input is in correct format. 

        //3. Encrypt the aadhaar_id and password
        const salt = 10
        const hashed_aadhaar_id = await bcrypt.hash(aadhaar_id, salt)

        // I missed this - check if its not an existing user
        const existing_user = await UserInformationModel.findOne({
            $or: [
                {email},
                {phone_number},
                {aadhaar_id: hashed_aadhaar_id}
            ]
        })
        
        if(existing_user){
            return res.status(409).json({error: "Email or phone_number or aadhaar_id already exists"})
        }


        const hashed_password = await bcrypt.hash(password, salt)

        //4. Generate the alias_name
        const randomHex = crypto.randomBytes(5).toString('hex').toUpperCase()
        const alias_name = `CITIZEN-${randomHex}`

        //5. Create the model object
        const new_user = new UserInformationModel({
            user_name,
            password: hashed_password,
            phone_number,
            email,
            aadhaar_id: hashed_aadhaar_id,
            alias_name
        })
        
        //6. Save and sent the confirmation
        const saved_user = await new_user.save()

        systemLogger.info(`New user created, user_name: ${new_user.user_name} & alias_name: ${new_user.alias_name}`);

        return res.status(201).json({
            message: "User Created Successfully",
            alias_name: `Your alias_name is: ${saved_user.alias_name}`
        })
        
    } catch (error) {
        systemLogger.error(`Failed to create new user: ${error.message}\nStack: ${error.stack}`);
        return res.status(500).json({error: "Internal Server Error"})
    }
}

export {createUserController}


//TODO: Check correctness of each input