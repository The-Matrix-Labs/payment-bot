
require('dotenv').config();
import { Telegraf, Context, session } from 'telegraf';
import { connection } from './configs/mongo.config';
import { generateWallet, validatePayment } from './actions/payment.action';
import { IGeneratedWallet, IUser } from './Interfaces/Interfaces';
import { UserModel } from './models/user.model';
import { WalletModel } from './models/wallet.model';
import { AD_OPTIONS } from './constants/constant';
import { CallbackQuery } from 'telegraf/typings/core/types/typegram';

const TEMPLATES = require('./templates/templates');


interface IUserSession {
    wallet: {
        address: string;
        privateKey: string;
    };
    amount: number;
}

interface SessionContext extends Context {
    session: IUserSession
}

const bot = new Telegraf<SessionContext>(process.env.BOT_TOKEN || '');


const initialSession: IUserSession = {
    wallet: { address: '', privateKey: '' },
    amount: 0
};

bot.use(session({ defaultSession: () => initialSession }));

bot.use(async (ctx, next) => {
    if (ctx.session && ctx.session.wallet.address && ctx.session.wallet.privateKey) {
        return next();
    }

    try {
        const userData: IUser | null = await UserModel.findOne({ chatID: ctx.chat?.id }).populate('wallet');
        if (userData && userData.wallet && typeof userData.wallet !== 'string') {
            ctx.session.wallet.address = userData.wallet.address
            ctx.session.wallet.privateKey = userData.wallet.privateKey
        }
    } catch (error) {
        console.log('error: ', error);
    }
    next()
})



bot.start(async (ctx: SessionContext) => {

    if (!ctx.session.wallet.address) {
        const newWallet: IGeneratedWallet = generateWallet();

        const wallet = new WalletModel(newWallet);
        await wallet.save();

        const userData = {
            username: ctx.from?.username,
            chatID: ctx.chat?.id,
            firstName: ctx.from?.first_name,
            lastName: ctx.from?.last_name,
            wallet: wallet._id
        }

        const user = new UserModel(userData);
        await user.save();

        ctx.session.wallet.address = newWallet.address;
        ctx.session.wallet.privateKey = newWallet.privateKey;

    }



    ctx.reply("Hey, I'm a bot!", {
        parse_mode: "HTML",
        reply_markup: {
            inline_keyboard: [
                [{ text: "Select Payment", callback_data: "show-projects" }]
            ]
        }
    });
});


bot.action("show-projects", (ctx: Context) => {
    ctx.reply("Please select a project", {
        reply_markup: {
            inline_keyboard: [
                [{ text: "Lucy", callback_data: "lucy" }]
            ]
        }
    })
});


bot.action("lucy", (ctx: Context) => {
    ctx.reply(TEMPLATES.paymentMenu, {
        parse_mode: "HTML",
        reply_markup: {
            inline_keyboard: [
                [{ text: "📢Ad Prices", callback_data: "ad-prices" }],
                [{ text: "Buy Premium", callback_data: "premium" }]
            ]
        }
    })
});

bot.action("ad-prices", (ctx: Context) => {
    ctx.reply(TEMPLATES.adPrices, {
        parse_mode: "HTML",
        reply_markup: {
            inline_keyboard: Object.values(AD_OPTIONS).map(option => (
                [{ text: option.label, callback_data: option.duration + "day-ad" }]
            ))
        }
    })
});


bot.action(/(\d)day-ad/, async (ctx: SessionContext) => {

    interface CustomCallbackQuery {
        data: string;
    }

    const session: IUserSession = ctx.session;
    const option: string = (ctx.callbackQuery as CustomCallbackQuery)?.data;

    const amount: number = AD_OPTIONS[option as keyof typeof AD_OPTIONS].amount;
    const duration: number = AD_OPTIONS[option as keyof typeof AD_OPTIONS].duration;

    session.amount = amount;
    
    const template = TEMPLATES.paymentTemplateWithAddress(ctx.session.wallet.address, amount, duration)
    ctx.reply(template, {
        parse_mode: 'HTML',
        reply_markup: {
            inline_keyboard: [
                [
                    { text: "Validate Payment", callback_data: "validate-payment" }
                ]
            ]
        }
    })

})

bot.action("validate-payment", async (ctx: SessionContext) => {
    const wallet = ctx.session.wallet;
    const amount = ctx.session.amount;

    const isPaymentValid = await validatePayment(wallet, amount);

    if (isPaymentValid) {
        return ctx.reply("Payment Validated! Your AD will be live shortly!");
    }
    return ctx.reply("Payment not validated! Please try again!");
})


connection.then(() => {
    console.log('MongoDB connected');
}).catch((err) => {
    console.error('MongoDB connection error:', err);
});

bot.launch();