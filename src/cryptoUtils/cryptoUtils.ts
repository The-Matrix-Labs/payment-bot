require('dotenv').config();
const CryptoJS = require('crypto-js');

export function encryptData(data: string): string {
    const key = process.env.ENCRYPTION_KEY || '';
    const encryptedData = CryptoJS.AES.encrypt(data, key).toString();
    return encryptedData;
}

export function decryptData(encryptedData: string): string {
    const key = process.env.ENCRYPTION_KEY || '';
    const decryptedBytes = CryptoJS.AES.decrypt(encryptedData, key);
    const decryptedData = decryptedBytes.toString(CryptoJS.enc.Utf8);
    return decryptedData;
}

