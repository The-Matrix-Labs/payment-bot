
const paymentMenu = `
🛒 Welcome to the Matrix Lab Payment Menu

Please select an option:
`

const adPrices = `
💰 AD Prices

Choose the AD package you want to purchase:
`;


// here is the template for the dynamic payment message
const paymentTemplateWithAddress = (address: string, amount: number, day: number) => (
    `
    Your wallet address for ${day} Day(s) AD - ${amount} ETH:
<code>${address}</code>

Please send ${amount} ETH to the above address. Once sent, please ensure the transaction is confirmed on the blockchain and click the button below!
    `
)

export = { paymentMenu, adPrices, paymentTemplateWithAddress }