import winston from "winston";

const { combine, timestamp, printf, colorize, json } = winston.format;

// 1. Shared Formats
const fileFormat = combine(
    timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    json()
);

const consoleFormat = combine(
    colorize(),
    timestamp({ format: "HH:mm:ss" }),
    printf(({ level, message, timestamp }) => `[${timestamp}] ${level}: ${message}`)
);

const consoleTransport = new winston.transports.Console({ format: consoleFormat });

// 2. System Logger (For citizens, unauthenticated users, and server crashes)
export const systemLogger = winston.createLogger({
    level: "info",
    format: fileFormat,
    transports: [
        new winston.transports.File({ filename: "logs/app.log" }),
        new winston.transports.File({ filename: "logs/error.log", level: "error" }),
        ...(process.env.NODE_ENV !== "production" ? [consoleTransport] : [])
    ],
});

// 3. Admin Logger (Strictly for admin actions)
export const adminLogger = winston.createLogger({
    level: "info",
    format: fileFormat,
    transports: [
        new winston.transports.File({ filename: "logs/admin.log" }),
        ...(process.env.NODE_ENV !== "production" ? [consoleTransport] : [])
    ],
});

// 4. Authority Logger (Strictly for police/authority actions)
export const authorityLogger = winston.createLogger({
    level: "info",
    format: fileFormat,
    transports: [
        new winston.transports.File({ filename: "logs/authority.log" }),
        ...(process.env.NODE_ENV !== "production" ? [consoleTransport] : [])
    ],
});

// Default export for generic server operations (like Morgan HTTP logging)
export default systemLogger;