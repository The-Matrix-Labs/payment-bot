import { config } from "dotenv";

// const PORT = process.env.PORT || 8080;
import { Telegraf, Context, session } from "telegraf";
import { connection } from "./configs/mongo.config";
import { generateWallet, validatePayment } from "./actions/payment.action";
import { IGeneratedWallet, IUser } from "./Interfaces/Interfaces";
import { UserModel } from "./models/user.model";
import { WalletModel } from "./models/wallet.model";
import { AD_OPTIONS } from "./constants/constant";
import { CallbackQuery } from "telegraf/typings/core/types/typegram";
import { decryptData, encryptData } from "./cryptoUtils/cryptoUtils";
import express from "express";

config();

const TEMPLATES = require("./templates/templates");

const bot = new Telegraf<SessionContext>(process.env.BOT_TOKEN || "");

const app = express();

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.use(bot.webhookCallback("/bot"));

app.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`);
});

bot.telegram.setWebhook(`https://busy-lime-gopher-coat.cyclic.app/bot`);

interface IUserSession {
  wallet: {
    address: string;
    privateKey: string;
  };
  amount: number;
}

interface SessionContext extends Context {
  session: IUserSession;
}

const initialSession: IUserSession = {
  wallet: { address: "", privateKey: "" },
  amount: 0,
};

bot.use(session({ defaultSession: () => initialSession }));

bot.use(async (ctx, next) => {
  if (
    ctx.session &&
    ctx.session.wallet.address &&
    ctx.session.wallet.privateKey
  ) {
    return next();
  }

  try {
    const userData: IUser | null = await UserModel.findOne({
      chatID: ctx.chat?.id,
    }).populate("wallet");

    if (userData && userData.wallet && typeof userData.wallet !== "string") {
      const decryptPrivateKey = decryptData(userData.wallet.privateKey);
      ctx.session.wallet.address = userData.wallet.address;
      ctx.session.wallet.privateKey = decryptPrivateKey;
    }
  } catch (error) {
    console.log("error: ", error);
  }
  next();
});

bot.start(async (ctx: SessionContext) => {
  console.log("working");

  if (!ctx.session.wallet.address) {
    const newWallet: IGeneratedWallet = generateWallet();

    ctx.session.wallet.address = newWallet.address;
    ctx.session.wallet.privateKey = newWallet.privateKey;

    //encrypting the data before saving it to the database
    newWallet.mnemonic = encryptData(newWallet.mnemonic);
    newWallet.privateKey = encryptData(newWallet.privateKey);

    const wallet = new WalletModel(newWallet);
    await wallet.save();

    const userData = {
      username: ctx.from?.username,
      chatID: ctx.chat?.id,
      firstName: ctx.from?.first_name,
      lastName: ctx.from?.last_name,
      wallet: wallet._id,
    };

    const user = new UserModel(userData);
    await user.save();
  }

  ctx.reply("Hey, I'm a bot!", {
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [
        [{ text: "Select Payment", callback_data: "show-projects" }],
      ],
    },
  });
});

bot.action("show-projects", (ctx: Context) => {
  ctx.reply("Please select a project", {
    reply_markup: {
      inline_keyboard: [[{ text: "Lucy", callback_data: "lucy" }]],
    },
  });
});

bot.action("lucy", (ctx: Context) => {
  ctx.reply(TEMPLATES.paymentMenu, {
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [
        [{ text: "📢Ad Prices", callback_data: "ad-prices" }],
        [{ text: "Buy Premium", callback_data: "premium" }],
      ],
    },
  });
});

bot.action("ad-prices", (ctx: Context) => {
  ctx.reply(TEMPLATES.adPrices, {
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: Object.values(AD_OPTIONS).map((option) => [
        { text: option.label, callback_data: option.duration + "day-ad" },
      ]),
    },
  });
});

bot.action(/(\d)day-ad/, async (ctx: SessionContext) => {
  interface CustomCallbackQuery {
    data: string;
  }

  const option: string = (ctx.callbackQuery as CustomCallbackQuery).data;

  const amount: number = AD_OPTIONS[option as keyof typeof AD_OPTIONS].amount;
  const duration: number =
    AD_OPTIONS[option as keyof typeof AD_OPTIONS].duration;

  const session: IUserSession = ctx.session;
  session.amount = amount;

  const template = TEMPLATES.paymentTemplateWithAddress(
    ctx.session.wallet.address,
    amount,
    duration
  );

  ctx.reply(template, {
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [
        [{ text: "Validate Payment", callback_data: "validate-payment" }],
      ],
    },
  });
});

bot.action("validate-payment", async (ctx: SessionContext) => {
  const wallet = ctx.session.wallet;
  const amount = ctx.session.amount;

  const userFromDB = await UserModel.findOne({ chatID: ctx.chat?.id });
  if (userFromDB) {
    const userID = userFromDB._id.toString();

    const isPaymentValid = await validatePayment(userID, wallet, amount);

    if (isPaymentValid) {
      return ctx.reply("Payment Validated! Your AD will be live shortly!");
    }
    return ctx.reply("Payment not validated! Please try again!");
  } else {
    return ctx.reply("User not found in the database!"); // Handle the case when the user is not found in the database
  }
});

connection
  .then(() => {
    console.log("MongoDB connected");
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
  });

// launching bot
// bot.launch();
console.log(`Bot launched Successfully 🤖`);

// Enable graceful stop
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
