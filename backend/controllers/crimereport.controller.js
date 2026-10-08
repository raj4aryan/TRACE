import CrimeReport from "../models/crimereport.model.js";
import { systemLogger } from "../utils/logger.js";
import crypto from "crypto";

// Single source of truth: the allowed sources come from the model's enum.
const SOURCES = CrimeReport.schema.path("source").enumValues;

const LIMITS = { category: 60, descriptionMin: 10, description: 2000, locationType: 50, field: 120, ipcEach: 20, ipcCount: 10 };
const ADDRESS_KEYS = ["street_name", "landmark", "locality", "city", "state"];

const isBlank = (v) => v === undefined || v === null || (typeof v === "string" && v.trim() === "");

// Accepts numbers or numeric strings only (rejects arrays, objects, booleans) and checks the range.
const parseCoordinate = (value, min, max) => {
    if (typeof value !== "number" && typeof value !== "string") return null;
    if (isBlank(value)) return null;
    const n = Number(value);
    return Number.isFinite(n) && n >= min && n <= max ? n : null;
};

// Accepts ["379","392"] or "379, 392". Returns an array, or null if invalid.
const parseIpcSections = (value) => {
    if (isBlank(value)) return [];
    const list = Array.isArray(value) ? value : typeof value === "string" ? value.split(",") : null;
    if (!list) return null;
    const cleaned = [];
    for (const item of list) {
        if (typeof item !== "string" && typeof item !== "number") return null;
        const s = String(item).trim();
        if (!s) continue;
        if (s.length > LIMITS.ipcEach) return null;
        cleaned.push(s);
    }
    return cleaned.length <= LIMITS.ipcCount ? cleaned : null;
};

// Keeps only known keys, so nothing unexpected reaches the database.
const parseAddress = (value) => {
    if (isBlank(value)) return { value: undefined };
    if (typeof value !== "object" || Array.isArray(value)) return { error: "address must be an object" };
    const out = {};
    for (const key of ADDRESS_KEYS) {
        const v = value[key];
        if (isBlank(v)) continue;
        if (typeof v !== "string" || v.trim().length > LIMITS.field) return { error: `address.${key} is invalid` };
        out[key] = v.trim();
    }
    if (!isBlank(value.pincode)) {
        const pin = String(value.pincode).trim();
        if (!/^\d{6}$/.test(pin)) return { error: "address.pincode must be 6 digits" };
        out.pincode = Number(pin);
    }
    return { value: Object.keys(out).length ? out : undefined };
};

const parseIncidentTime = (value) => {
    if (isBlank(value)) return { value: undefined };
    if (typeof value !== "string" && typeof value !== "number") return { error: "incident_time is not a valid date" };
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return { error: "incident_time is not a valid date" };
    if (d.getTime() > Date.now() + 5 * 60 * 1000) return { error: "incident_time can't be in the future" };
    return { value: d };
};

const makeIncidentId = () => {
    const randomHex = crypto.randomBytes(4).toString("hex").toUpperCase();
    const datePart = new Date().toISOString().split("T")[0];
    return `INC-${datePart}-${randomHex}`;
};

const crimeReportPostController = async (req, res) => {
    try {
        // 1. The alias comes from the verified session (set by the auth middleware), never from the request body
        const reported_by_alias = req.user?.alias_name;
        if (!reported_by_alias) {
            return res.status(401).json({ error: "Unauthorized: User alias not found in session" });
        }

        // 2. Basic body validation
        if (!req?.body || typeof req.body !== "object" || Object.keys(req.body).length === 0) {
            return res.status(400).json({ error: "Invalid Request: Empty body" });
        }

        // 3. Extract fields from the frontend payload
        const { source, crime_category, description, location_type, address, ipc_section, incident_time, longitude, latitude } = req.body;

        // 4. Validate required fields
        if (isBlank(source) || isBlank(crime_category) || isBlank(description) || isBlank(longitude) || isBlank(latitude)) {
            return res.status(400).json({ error: "Missing required fields (source, category, description, coordinates)" });
        }

        // 5. Validate each input
        // TODO: if only authorities should file Official_FIR / News_Scrape, restrict this endpoint to "citizen" (or check req.user.role).
        if (!SOURCES.includes(source)) {
            return res.status(400).json({ error: `Invalid source. Allowed: ${SOURCES.join(", ")}` });
        }
        if (typeof crime_category !== "string" || crime_category.trim().length > LIMITS.category) {
            return res.status(400).json({ error: `crime_category must be text up to ${LIMITS.category} characters` });
        }
        if (typeof description !== "string" || description.trim().length < LIMITS.descriptionMin || description.trim().length > LIMITS.description) {
            return res.status(400).json({ error: `description must be ${LIMITS.descriptionMin} to ${LIMITS.description} characters` });
        }
        if (!isBlank(location_type) && (typeof location_type !== "string" || location_type.trim().length > LIMITS.locationType)) {
            return res.status(400).json({ error: "location_type is invalid" });
        }

        const lng = parseCoordinate(longitude, -180, 180);
        const lat = parseCoordinate(latitude, -90, 90);
        if (lng === null || lat === null) {
            return res.status(400).json({ error: "Invalid coordinates: longitude must be -180 to 180 and latitude -90 to 90" });
        }

        const ipc = parseIpcSections(ipc_section);
        if (ipc === null) {
            return res.status(400).json({ error: "ipc_section must be a list (or comma-separated text) of short section numbers" });
        }

        const parsedAddress = parseAddress(address);
        if (parsedAddress.error) return res.status(400).json({ error: parsedAddress.error });

        const parsedTime = parseIncidentTime(incident_time);
        if (parsedTime.error) return res.status(400).json({ error: parsedTime.error });

        // ML INTEGRATION FOR severity_index
        const severity_index = undefined;

        // 6. Save. Retry with a fresh ID in the rare case two reports collide on the same random ID.
        let savedReport;
        for (let attempt = 0; attempt < 3; attempt++) {
            try {
                savedReport = await new CrimeReport({
                    incident_id: makeIncidentId(),
                    source,
                    crime_category: crime_category.trim(),
                    ipc_section: ipc,
                    description: description.trim(),
                    location_type: isBlank(location_type) ? undefined : location_type.trim(),
                    address: parsedAddress.value,
                    incident_time: parsedTime.value,
                    location: {
                        type: "Point",
                        // Mongoose 2dsphere requires strictly [longitude, latitude]
                        coordinates: [lng, lat]
                    },
                    severity_index,
                    reported_by_alias,
                    verification_status: "Pending"
                }).save();
                break;
            } catch (err) {
                const idCollision = err.code === 11000 && err.keyPattern?.incident_id;
                if (idCollision && attempt < 2) continue;
                throw err;
            }
        }

        systemLogger.info(`New crime report submitted by alias: ${reported_by_alias}`);

        return res.status(201).json({
            message: "Crime report submitted successfully",
            incident_id: savedReport.incident_id
        });

    } catch (error) {
        // Anything Mongoose rejects (bad types, failed validators) is the client's problem, not a server fault
        if (error.name === "ValidationError" || error.name === "CastError") {
            systemLogger.warn(`Rejected invalid report: ${error.message}`);
            return res.status(400).json({ error: "Invalid report data" });
        }
        systemLogger.error(`Failed to submit report: ${error.message}\nStack: ${error.stack}`);
        return res.status(500).json({ error: "Internal Server Error" });
    }
};

const getNearbyReportsController = async (req, res) => {
    try {
        if(!req?.query){
            return res.status(400).json({error:"Invalid Request"})
        }
        // 1. Extract bounding box corners from the URL query parameters
        const { swLng, swLat, neLng, neLat } = req.query;

        // 2. Validate that all coordinates are provided
        if (!swLng || !swLat || !neLng || !neLat) {
            return res.status(400).json({ error: "Missing bounding box coordinates in query" });
        }

        // 3. Convert strings to floats
        const sw = [parseFloat(swLng), parseFloat(swLat)];
        const ne = [parseFloat(neLng), parseFloat(neLat)];

        if (sw.some(isNaN) || ne.some(isNaN)) {
            return res.status(400).json({ error: "Coordinates must be valid numbers" });
        }

        // 4. Fetch the data using MongoDB Geospatial bounds
        const fetchedData = await CrimeReport.find({
            verification_status: "Verified", // Strict security: Only show verified reports to citizens
            location: {
                $geoWithin: {$box: [
                        sw, // Bottom-left corner [longitude, latitude]
                        ne  // Top-right corner [longitude, latitude]
                    ]
                }
            }
        })
        .select("incident_id crime_category incident_time location severity_index description") // Only send what the map needs
        .limit(100) // Hard limit to prevent DB overload if zoomed out too far
        .lean(); // Speeds up the query by returning raw JSON instead of heavy Mongoose documents

        return res.status(200).json({
            success: true,
            count: fetchedData.length,
            reports: fetchedData
        });

    } catch (error) {
        systemLogger.error(`Failed to fetch nearby reports: ${error.message}\nStack: ${error.stack}`);
        return res.status(500).json({ error: "Internal Server Error" });
    }
};

export {crimeReportPostController, getNearbyReportsController};