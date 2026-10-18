import mongoose, { Schema } from "mongoose";

const userInformationSchema = new Schema({
  user_name: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 100
  },
  phone_number: {
    type: String,
    required: true,
    unique: true,
    match: /^[6-9]\d{9}$/
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    maxlength: 254
  },
  password: {
    type: String,
    required: true
    // Keep selected by default: the existing login.controller.js reads this field.
  },
  alias_name: {
    type: String,
    required: true,
    unique: true
  },
  role: {
    type: String,
    enum: ["citizen", "admin", "authority"],
    default: "citizen"
  }
}, { timestamps: true });

// No aadhaar_id field. Existing MongoDB documents must be cleaned using
// scripts/remove-aadhaar.mjs after verification and backup.
const UserInformationModel = mongoose.model("UserInformation", userInformationSchema);
export default UserInformationModel;
