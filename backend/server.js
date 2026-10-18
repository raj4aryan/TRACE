import express from 'express'
import morgan from 'morgan'
import cors from 'cors'
import "dotenv/config"
import cookieParser from 'cookie-parser'
import connectDB from './config/db.config.js'
import registeruserRoute from './routes/api/registeruser.route.js'
import incidentsRouter from './routes/api/incidents.route.js'
import userloginRoute from './routes/api/loginuser.route.js'
import userlogoutRoute from './routes/api/logoutuser.route.js'
import logger from './utils/logger.js'
import { authorityTwoRoles } from "./config/authority.config.js"
import { verifyJwt, verifyRole } from "./middlewares/auth.middleware.js"
import updateUserRoleRoute from './routes/api/authorizeroles.route.js'
import { allowedOrigins } from './config/allowedorigins.config.js'


const app = express()

const morganFormat = ":method :url :status :res[content-length] - :response-time ms";
app.use(
    morgan(morganFormat, {
        stream: {
            write: (message) => logger.info(message.trim())
        }
    })
);

connectDB()
const PORT = process.env.SERVER_PORT
// Replace the exact URL with whatever port your Vite app is running on (usually 5173)
app.use(cors({
    origin: allowedOrigins, 
    credentials: true
}));
app.use(express.json())
app.use(cookieParser())

// Authentication routes (existing URLs preserved)
app.use("/registeruser", registeruserRoute);
app.use("/loginuser", userloginRoute);
app.use("/logoutuser", userlogoutRoute);

// All incident operations have a single mount.
// Public/authenticated/authority/admin checks live in incidents.route.js.
app.use("/api/incidents", incidentsRouter);

// Admin-only user role management (existing URL preserved)
app.use(
    "/authorizerole",
    verifyJwt,
    verifyRole(authorityTwoRoles, "Update Roles"),
    updateUserRoleRoute
);

app.listen(PORT, () => {
    console.log(`server started on PORT: ${PORT}`)
})