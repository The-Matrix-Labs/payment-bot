import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
    username: {
        type: String,
        default: ""
    },
    chatID: {
        type: String,
        default: ""
    },
    firstName: {
        type: String,
        default: ""
    },
    lastName: {
        type: String,
        default: ""
    },
    wallet: {
        type: mongoose.Types.ObjectId,
        ref: "Wallet",
        default: null
    }
})

 
export const UserModel = mongoose.model("User", UserSchema);
