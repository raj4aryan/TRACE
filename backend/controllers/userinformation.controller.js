import UserInformationModel from "../models/users.model.js";
import systemLogger from "../utils/logger.js";
import crypto from "node:crypto";
import bcrypt from "bcrypt";

const ALLOWED_FIELDS = new Set(["user_name", "email", "phone_number", "password"]);
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^[6-9]\d{9}$/; // Indian 10-digit mobile number, without +91

const createUserController = async (req, res) => {
  try {
    const body = req.body;
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return res.status(400).json({ error: "Expected a JSON object" });
    }

    // Reject Aadhaar instead of silently accepting/storing it. Old frontends
    // must be updated before rollout.
    if (Object.hasOwn(body, "aadhaar_id")) {
      return res.status(400).json({ error: "TRACE no longer collects Aadhaar numbers" });
    }

    const unknownFields = Object.keys(body).filter((key) => !ALLOWED_FIELDS.has(key));
    if (unknownFields.length) {
      return res.status(400).json({ error: "Unsupported registration fields" });
    }

    const { user_name, email, phone_number, password } = body;
    if (
      typeof user_name !== "string" ||
      typeof email !== "string" ||
      typeof phone_number !== "string" ||
      typeof password !== "string"
    ) {
      return res.status(400).json({ error: "Name, email, phone and password are required" });
    }

    const name = user_name.trim();
    const normalizedEmail = email.trim().toLowerCase();
    const phone = phone_number.trim();

    if (name.length < 2 || name.length > 100) {
      return res.status(400).json({ error: "Name must contain 2 to 100 characters" });
    }
    if (normalizedEmail.length > 254 || !EMAIL_PATTERN.test(normalizedEmail)) {
      return res.status(400).json({ error: "Invalid email address" });
    }
    if (!PHONE_PATTERN.test(phone)) {
      return res.status(400).json({ error: "Phone must be a valid 10-digit Indian mobile number" });
    }
    // bcrypt only considers the first 72 bytes of a password.
    if (password.length < 8 || Buffer.byteLength(password, "utf8") > 72) {
      return res.status(400).json({ error: "Password must have at least 8 characters and at most 72 UTF-8 bytes" });
    }

    const exists = await UserInformationModel.exists({
      $or: [{ email: normalizedEmail }, { phone_number: phone }]
    });
    if (exists) {
      return res.status(409).json({ error: "Email or phone number already registered" });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    // Rare alias collisions are retried; unique DB indexes protect races.
    let savedUser;
    for (let attempt = 0; attempt < 3; attempt++) {
      const alias = `CITIZEN-${crypto.randomBytes(5).toString("hex").toUpperCase()}`;
      try {
        savedUser = await UserInformationModel.create({
          user_name: name,
          email: normalizedEmail,
          phone_number: phone,
          password: passwordHash,
          alias_name: alias,
          role: "citizen"
        });
        break;
      } catch (error) {
        const aliasCollision =
          error.code === 11000 &&
          (error.keyPattern?.alias_name || error.keyValue?.alias_name);
        if (aliasCollision && attempt < 2) continue;
        throw error;
      }
    }

    systemLogger.info(`Registered account: ${savedUser.alias_name}`);
    return res.status(201).json({
      message: "User Created Successfully",
      alias_name: savedUser.alias_name
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: "Email or phone number already registered" });
    }
    if (error.name === "ValidationError" || error.name === "CastError") {
      return res.status(400).json({ error: "Invalid registration details" });
    }
    systemLogger.error(`Registration failed: ${error.message}`);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

export { createUserController };
