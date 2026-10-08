import mongoose, { Schema } from "mongoose";

const crimeReportSchema = new Schema(
  {
  incident_id: { 
    type: String, 
    required: true,
    unique: true
  },
  source: {
    type: String,
    enum: ["citizen", "Official_FIR", "News_Scrape"],
    required: true
  },
  // When the report was filed.
  timestamp: { 
    type: Date,
    default: Date.now
  },
  // When the citizen actually saw or faced the incident (optional, can't be in the future).
  incident_time: {
    type: Date,
    validate: {
      validator: (d) => !d || d.getTime() <= Date.now() + 5 * 60 * 1000, // 5 min allowance for clock drift
      message: "incident_time can't be in the future"
    }
  },
  // Free text on purpose: covers crimes ("Larceny") and citizen alerts ("Missing turn sign board").
  crime_category: { 
    type: String,
    required: true,
    trim: true,
    maxlength: 60
  },
  ipc_section: { 
    type: [String]
  },
  description: { 
    type: String,
    required: true,
    trim: true,
    maxlength: 2000
  },
  location_type: {
    type: String,
    trim: true,
    maxlength: 50
  },
  
  // --- Indian Geographic Hierarchy ---
  address: {
    street_name: String,
    landmark: String,
    locality: String,      // e.g., Kothrud, Deccan Gymkhana
    city: String,          // e.g., Pune
    state: String,         // e.g., Maharashtra
    pincode: { type: Number, min: 100000, max: 999999 }  // 6-digit Indian PIN
  },
  police_jurisdiction: { 
    type: String 
  },

  // --- MongoDB Geospatial Field ---
  location: {
    type: {
      type: String,
      enum: ["Point"],
      default: "Point"
    },
    coordinates: {
      type: [Number],      // Format: [longitude, latitude]
      required: true,
      validate: {
        validator: (c) =>
          Array.isArray(c) && c.length === 2 &&
          c[0] >= -180 && c[0] <= 180 &&   // longitude
          c[1] >= -90 && c[1] <= 90,       // latitude
        message: "coordinates must be [longitude, latitude] within valid ranges"
      }
    }
  },

  // --- TRACE ML & Analytics Fields ---
  severity_index: {
    type: Number 
  },
  verification_status: {
    type: String,
    enum: ["Pending", "Verified", "Rejected"],
    default: "Pending"
  },
  
  // --- ANONYMITY FIELD ---
  reported_by_alias: {
    type: String,
    required: true // This connects to the User collection securely
  }
}, 
{
  timestamps: true // Automatically adds createdAt and updatedAt fields
});

// CRITICAL: This index allows MongoDB to run geospatial bounding box/radius queries
crimeReportSchema.index({ location: "2dsphere" });
// Speeds up the authority review queue (pending reports, newest first).
crimeReportSchema.index({ verification_status: 1, createdAt: -1 });

const CrimeReportModel = mongoose.model("CrimeReport", crimeReportSchema);

export default CrimeReportModel;