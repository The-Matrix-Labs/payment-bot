import mongoose from "mongoose";

const TransactionDetailsSchema = new mongoose.Schema({
    to: {
        type: String,
        default: ""
    },
    value: {
        type: String,
        default: ""
    },
    hash: {
        type: String,
        default: ""
    },
    from: {
        type: String,
        default: ""
    },
    user: {
        type: mongoose.Types.ObjectId,
        ref: "User",
        default: null
    }
})


export const TransactionsModel = mongoose.model("Transaction", TransactionDetailsSchema);
