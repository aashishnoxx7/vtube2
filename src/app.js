import express from "express"
import cors from "cors"
import healthcheckRouter from "./routes/healthcheck.routes.js"
import cookieParser from "cookie-parser"
//import multer from "multer"




//MongoDB password : vidtubeuser1234

const app = express()
app.use(
    cors({
        origin : process.env.CORS_ORIGIN,
        credentials : true
    })
)

//common middleware
app.use(express.json({limit : "16kb"}))
app.use(express.urlencoded({extended : true, limit : "16kb"}))
app.use(express.static("public"))
app.use(cookieParser())

//import routes
import userRouter from "./routes/user.routes.js"
import { errorHandler } from "./middlewares/error.middlewares.js"


//routes

app.use("/api/v1/healthcheck", healthcheckRouter)
app.use("/api/v1/users", userRouter)
app.use(errorHandler)

export { app }