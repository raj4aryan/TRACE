import UserInformationModel from "../models/users.model.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import "dotenv/config";
import { systemLogger, adminLogger, authorityLogger } from "../utils/logger.js";

const COOKIE_NAME = "trace_token";
const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const getRoleLogger = (role) => {
  if (role === "admin") return adminLogger;
  if (role === "authority") return authorityLogger;
  return systemLogger;
};

const loginController = async (req, res) => {
  // Authentication responses should not be stored in browser/proxy caches.
  res.set("Cache-Control", "no-store");

  try {
    const body = req.body;
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return res.status(400).json({ error: "Expected a JSON object" });
    }

    const { email, password } = body;
    if (typeof email !== "string" || typeof password !== "string") {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const normalizedEmail = email.trim().toLowerCase();
    // Do NOT trim passwords: whitespace may be part of a password.
    if (
      normalizedEmail.length > 254 ||
      !EMAIL_PATTERN.test(normalizedEmail) ||
      password.length === 0 ||
      Buffer.byteLength(password, "utf8") > 1024
    ) {
      return res.status(400).json({ error: "Invalid email or password format" });
    }

    const user = await UserInformationModel.findOne({ email: normalizedEmail });
    // Give the same message for unknown email and wrong password.
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: "Invalid Credentials" });
    }

    if (!process.env.JWT_SECRET_KEY) {
      systemLogger.error("JWT_SECRET_KEY is missing; login is unavailable");
      return res.status(500).json({ error: "Internal server error" });
    }

    const payload = {
      user_id: user._id.toString(),
      alias_name: user.alias_name,
      role: user.role,
    };
    const token = jwt.sign(payload, process.env.JWT_SECRET_KEY, {
      expiresIn: "2h",
    });

    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/", // Must match logout.controller.js clearCookie path.
      maxAge: TWO_HOURS_MS,
    });

    getRoleLogger(user.role).info(`User logged in: ${user.alias_name}`);
    return res.status(200).json({
      message: "Login successful",
      user: {
        user_name: user.user_name,
        alias_name: user.alias_name,
        role: user.role,
      },
    });
  } catch (error) {
    systemLogger.error(`Login failed unexpectedly: ${error.message}`);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export default loginController;
