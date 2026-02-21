/**
 * 支付 API (Stripe)
 */
const express = require('express');
const router = express.Router();
const db = require('../db');

const stripe = process.env.STRIPE_SECRET_KEY ? require('stripe')(process.env.STRIPE_SECRET_KEY) : null;

const SERVICE_PRICES = {
  home: 50000,      // 500 元/台
  commercial: 50000,
  maintenance: 50000,
};

// 创建支付 intent
router.post('/create-intent', async (req, res) => {
  try {
    const { bookingId, amount } = req.body;

    if (!stripe || !process.env.STRIPE_SECRET_KEY) {
      return res.status(503).json({
        error: '支付功能未配置',
        message: '请在 .env 中配置 STRIPE_SECRET_KEY',
      });
    }

    const amt = amount || (bookingId ? (() => {
      const b = db.prepare('SELECT service, units FROM bookings WHERE id = ?').get(bookingId);
      if (!b) return null;
      const base = SERVICE_PRICES[b.service] || 50000;
      return base * (b.units || 1);
    })() : 50000);

    if (!amt) return res.status(400).json({ error: '无效的预约或金额' });

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amt,
      currency: 'cny',
      metadata: { bookingId: String(bookingId || '') },
    });

    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || '创建支付失败' });
  }
});

// 支付成功回调 (webhook)
function handleWebhook(req, res) {
  if (!stripe) return res.status(503).send('Stripe not configured');
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (e) {
    return res.status(400).send(`Webhook Error: ${e.message}`);
  }
  if (event.type === 'payment_intent.succeeded') {
    const pi = event.data.object;
    const bookingId = pi.metadata?.bookingId;
    if (bookingId) {
      db.prepare(`
        UPDATE bookings SET payment_status = 'paid', payment_id = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(pi.id, bookingId);
    }
  }
  res.json({ received: true });
}

// 支付状态查询
router.get('/status/:bookingId', (req, res) => {
  const b = db.prepare('SELECT payment_status, payment_id FROM bookings WHERE id = ?').get(req.params.bookingId);
  if (!b) return res.status(404).json({ error: '预约不存在' });
  res.json({ payment_status: b.payment_status });
});

router.handleWebhook = handleWebhook;
module.exports = router;
