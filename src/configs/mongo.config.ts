require("dotenv").config();
import mongoose from "mongoose";

const mongoDB_url = process.env.MONGODB_URL || "";

export const connection = mongoose.connect(mongoDB_url);


