import mongoose from "mongoose";
import "dotenv/config"
const DB_URI = process.env.DB_URI

const connectDB = async ()=>{
    try {
        const connected = await mongoose.connect(DB_URI)
        if(connected){
            console.log("Connected to Database...")
        }
        else{
            console.log("Connection failed")
        }
    } catch (error) {
        console.log(error)
    }
}

export default connectDB