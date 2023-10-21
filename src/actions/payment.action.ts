require('dotenv').config();
import { BigNumber, Wallet, ethers } from "ethers";
import { IGeneratedWallet } from "../Interfaces/Interfaces";
import { TransactionsModel } from "../models/transactionDetails.model";


const OWNER_ADDRESS = (process.env.OWNER_ADDRESS || '') as string;

const PROVIDER_URL = (process.env.PROVIDER_URL || '') as string;

const provider = new ethers.providers.JsonRpcProvider(PROVIDER_URL);

interface ITx {
    to: string,
    value: BigNumber
}



export  function generateWallet(): IGeneratedWallet {

    // menemonic is a 12 word phrase that can be used to generate a wallet
    const mnemonic: string = ethers.Wallet.createRandom().mnemonic.phrase;

    // Creating  a wallet instance from the mnemonic
    const wallet = ethers.Wallet.fromMnemonic(mnemonic);

    return {
        mnemonic: mnemonic,
        privateKey: wallet.privateKey,
        address: wallet.address,
        publicKey: wallet.publicKey
    }
}

export async function validatePayment(userID:string, wallet: { address: string, privateKey: string }, amount: number) {
    console.log('amount: ', amount);

    const walletWithProvider = new ethers.Wallet(wallet.privateKey, provider);

    try {
        const balance = await walletWithProvider.getBalance();

        const balanceInEth = ethers.utils.formatEther(balance);
        console.log('balanceInEth: ', balanceInEth);

        if (Number(balanceInEth) >= amount) {

            const tx = {
                to: OWNER_ADDRESS,
                value: ethers.utils.parseEther(amount.toString()) // Amount to send in Ether
            };

            const gasFee = await getGasFee(tx);
            // console.log("gasFee",gasFee);

            tx.value = tx.value.sub(ethers.utils.parseEther(gasFee));
            console.log("value",ethers.utils.formatEther(tx.value));

           await sendTransaction(userID,walletWithProvider, tx);

            return true;
        } else {
            return false;
        }
    } catch (error) {
        console.log('error - in - this: ', error);
    }
}

// Transaction object
const sendTransaction = async (userID:string, walletWithProvider: Wallet, tx: ITx) => {
    // Sending the transaction
    const txResponse = await walletWithProvider.sendTransaction(tx);
    await txResponse.wait();
    // console.log("Transaction: ", txResponse);

    // saving the transaction details to the database
    const transactionData = {
        to: txResponse.to,
        value: ethers.utils.formatEther(txResponse.value),
        hash: txResponse.hash,
        from: txResponse.from,
        user: userID
    }

    const newTransaction = new TransactionsModel(transactionData);
    await newTransaction.save();
};


async function getGasFee(tx: ITx) {
    let gasPrice = await provider.getGasPrice();
    gasPrice = gasPrice.add(gasPrice.mul(10).div(100));
    const estimatedGas = await provider.estimateGas(tx);
    return ethers.utils.formatEther(gasPrice.mul(estimatedGas));
}