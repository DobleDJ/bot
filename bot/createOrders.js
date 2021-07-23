const { Order } = require('../models');
const { createHoldInvoice, subscribeInvoice } = require('../ln');

const createOrder = async (ctx, bot, { type, amount, seller, buyer, fiatAmount, fiatCode, paymentMethod, buyerInvoice, status }) => {
  const action = type == 'sell' ? 'Vendiendo' : 'Comprando';
  const trades = type == 'sell' ? seller.tradesCompleted : buyer.tradesCompleted;
  const description = `${action} ${amount} sats\nPor ${fiatCode} ${fiatAmount}\nPago por ${paymentMethod}\nTiene ${trades} operaciones exitosas`;
  try {
    if (type === 'sell') {
      const invoiceDescription = `Venta por @P2PLNBot`;
      const { request, hash, secret } = await createHoldInvoice({
        amount: amount + amount * process.env.FEE,
        description: invoiceDescription,
      });
      if (!!hash) {
        const order = new Order({
          description,
          amount,
          hash,
          secret,
          creatorId: seller._id,
          sellerId: seller._id,
          type,
          fiat_amountrice: fiatAmount,
          fiat_code: fiatCode,
          payment_method: paymentMethod,
          buyerInvoice,
          tg_chatID: ctx.message.chat.id,
          tg_order_message: ctx.message.message_id,
        });
        await order.save();
        // monitoreamos esa invoice para saber cuando el usuario realice el pago
        await subscribeInvoice(ctx, bot, hash);

        return { request, order };
      }
    } else {
      const description = `${action} ${amount} sats\nPor ${fiatCode} ${fiatAmount}\nRecibo pago por ${paymentMethod}`;
      const order = new Order({
        description,
        amount,
        creatorId: buyer._id,
        buyerId: buyer._id,
        type,
        fiat_amountrice: fiatAmount,
        fiat_code: fiatCode,
        payment_method: paymentMethod,
        buyerInvoice,
        status,
        tg_chatID: ctx.message.chat.id,
        tg_order_message: ctx.message.message_id,
      });
      await order.save();

      return { order };
    }
  } catch (e) {
    console.log(e);
  }
};

module.exports = {
  createOrder,
};
