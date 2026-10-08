import mongoose, { Schema } from "mongoose";

const userInformationSchema = new Schema({
    user_name: {
        type: String,
        required: true
    },
    phone_number: {
        type: String,
        required: true,
        unique: true // Prevents multiple accounts with the same phone
    },
    email: {
        type: String,
        required: true,
        unique: true, // Prevents multiple accounts with the same email
        lowercase: true, // Standardizes emails to prevent login case-sensitivity issues
        trim: true
    },
    aadhaar_id: {
        type: String,
        required: true
        // SECURITY WARNING: Storing a 12-digit Aadhaar in plain text is a severe data privacy risk. 
        // In a real production environment, you should hash this (using bcrypt) if you only need 
        // it for one-time verification, or use two-way encryption if admins must read it. 
        // Alternatively, only store the last 4 digits.
    },
    password:{
        type: String,
        required: true
    },
    alias_name: {
        type: String,
        required: true,
        unique: true
    },
    role:{
        type: String,
        enum: ['citizen', 'admin', 'authority'],
        default: 'citizen'
    }
}, {
    timestamps: true // Automatically adds 'createdAt' and 'updatedAt' fields. 
});

const UserInformationModel = mongoose.model("UserInformation", userInformationSchema);

export default UserInformationModel;