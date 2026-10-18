import CrimeReportModel from "../models/crimereport.model.js";

const getIncidentController = async (req, res) => {
  try {
    // 1. Information provided through the URL
    const { incident_id } = req.params;

    // 2. Information established by JWT middleware
    const { role, alias_name } = req.user;

    // 3. Prepare the query
    const query = { incident_id };

    // 4. Apply role-based access conditions
    if (role === "citizen") {

      query.reported_by_alias = alias_name;

    } else if (role === "authority" || role === "admin") {

      query.verification_status = "Pending";

    } else {

      return res.status(403).json({
        error: "Access denied"
      });

    }

    // 5. Fetch only an incident the user is allowed to access
    const incident = await CrimeReportModel
      .findOne(query)
      .select(
        "incident_id crime_category description " +
        "incident_time timestamp address location " +
        "verification_status"
      )
      .lean();

    // 6. No matching authorized incident
    if (!incident) {
      return res.status(404).json({
        error: "Incident not found"
      });
    }

    // 7. Return the permitted incident information
    return res.status(200).json({
      incident
    });

  } catch (error) {

    console.error("Failed to fetch incident:", error);

    return res.status(500).json({
      error: "Internal server error"
    });

  }
};

export default getIncidentController;