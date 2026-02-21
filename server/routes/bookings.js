/**
 * 预约 API
 */
const express = require('express');
const router = express.Router();
const db = require('../db');
const { sendBookingConfirmation } = require('../services/notification');

router.post('/', async (req, res) => {
  try {
    const { name, phone, service, units, date, time, address, notes } = req.body;

    if (!name?.trim() || !phone?.trim() || !service || !date || !time || !address?.trim()) {
      return res.status(400).json({ error: '请填写所有必填项' });
    }

    const phoneRegex = /^1[3-9]\d{9}$/;
    if (!phoneRegex.test(phone.trim())) {
      return res.status(400).json({ error: '请输入正确的手机号码' });
    }

    const stmt = db.prepare(`
      INSERT INTO bookings (name, phone, service, units, date, time, address, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      name.trim(),
      phone.trim(),
      service,
      units || 1,
      date,
      time,
      address.trim(),
      notes?.trim() || null
    );

    const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(result.lastInsertRowid);

    // 发送邮件和短信通知
    try {
      await sendBookingConfirmation(booking);
    } catch (notifyErr) {
      console.warn('通知发送失败:', notifyErr.message);
    }

    res.status(201).json({ success: true, booking });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '预约提交失败' });
  }
});

module.exports = router;
