import dotenv from "dotenv";
import { app } from "./app.js";
import connectDB from "./db/index.js";
// import dotenv from "dotenv";
dotenv.config();
// dotenv.config({
//     path : "./.env"
// })
const PORT = process.env.PORT || 7000

connectDB()
.then(() => {
    app.listen(PORT, ()=>{
    console.log(`server is running at port number ${PORT}`);
})
})
.catch((err) => {
    console.log(`MongoDB connection error... ${err}`)
})