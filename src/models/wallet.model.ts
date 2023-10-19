import mongoose from "mongoose";

const WalletSchema = new mongoose.Schema({
    address: {
        type: String,
        default: ""
    },
    mnemonic: {
        type: String,
        default: ""
    },
    publicKey: {
        type: String,
        default: ""
    },
    privateKey: {
        type: String,
        default: ""
    }
});


export const WalletModel = mongoose.model("Wallet", WalletSchema);