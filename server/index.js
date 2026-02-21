/**
 * 清风空调清洗 - 后端服务
 */
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const bookingsRouter = require('./routes/bookings');
const adminRouter = require('./routes/admin');
const paymentRouter = require('./routes/payment');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

// Webhook 必须在 json 解析之前，需 raw body
app.post('/api/payment/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  require('./routes/payment').handleWebhook(req, res);
});

app.use(express.json());
app.use(express.static(path.join(__dirname, '..')));

app.use('/api/bookings', bookingsRouter);
app.use('/api/admin', adminRouter);
app.use('/api/payment', paymentRouter);

app.listen(PORT, () => {
  console.log(`服务已启动: http://localhost:${PORT}`);
});
