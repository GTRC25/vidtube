import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"

const app = express()

app.use(
    cors({
        origin: process.env.CORS_ORIGIN,
        credentials: true
    })
)


// common middleware
app.use(express.json({limit: "16kb"}))
app.use(express.urlencoded({extended: true, limit: "16kb"}))
app.use(express.static("public")) //To server static files like HTML,CSS,js
app.use(cookieParser())
// Middleware to parse cookies from incoming requests and make them accessible via req.cookies


//import routes

import healthcheckRouter from "./routes/healthcheck.routes.js"

//routes
app.use("/api/v1/healthcheck", healthcheckRouter)

export { app }