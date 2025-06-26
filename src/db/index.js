import dotenv from "dotenv"
dotenv.config({path:"../.env"})
import mongoose from "mongoose";
import { DB_NAME } from "../contants.js";


const connectDB = async () => {
    try {
        const connection = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        console.log("mongoDb connected!!",connection.connection.host)
    } catch (error) {
        console.log("mongoDB connection error",error)
        process.exit(1)
    }
}


export default connectDB