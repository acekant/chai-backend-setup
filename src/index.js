import mongoose from "mongoose";
import connectDB from "./db/index.js";



connectDB()
.then(() => {
    app.listen(process.env.PORT || 8000,() => {
        console.log("server is listening in port",process.env.PORT)
    })
})
.catch((err) => {
    console.log("mongodb connection failed")
})