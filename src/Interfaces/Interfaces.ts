import { Document } from 'mongoose';

export interface IGeneratedWallet {
    address: string;
    mnemonic: string;
    publicKey: string;
    privateKey: string;
}

export interface IWallet extends IGeneratedWallet, Document {
    // You can add additional properties specific to IWallet here if needed
}

export interface IUser extends Document {
    username: string;
    chatID: string;
    firstName: string;
    lastName: string;
    wallet?: IWallet | string;
}

export interface ITransactionDocument extends Document {
    to: string;
    value: string;
    hash: string;
    from: string;
    confirmations: number;
}
