/**
 * 管理后台 API
 */
const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../db');
const { sendEmail } = require('../services/notification');

const jwtSecret = process.env.JWT_SECRET || 'ac-booking-secret-key';

function createToken(username) {
  const payload = JSON.stringify({ username, exp: Date.now() + 24 * 60 * 60 * 1000 });
  return Buffer.from(payload).toString('base64');
}

function verifyToken(token) {
  try {
    const payload = JSON.parse(Buffer.from(token, 'base64').toString());
    if (payload.exp < Date.now()) return null;
    return payload.username;
  } catch {
    return null;
  }
}

function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null;
  const username = verifyToken(token);
  if (!username) return res.status(401).json({ error: '请先登录' });
  req.username = username;
  next();
}

// 登录
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: '请输入用户名和密码' });
  }
  const hash = crypto.createHash('sha256').update(password).digest('hex');
  const user = db.prepare('SELECT * FROM admin_users WHERE username = ? AND password_hash = ?').get(username, hash);
  if (!user) return res.status(401).json({ error: '用户名或密码错误' });
  const token = createToken(username);
  res.json({ token, username });
});

// 获取预约列表
router.get('/bookings', authMiddleware, (req, res) => {
  const { status, date_from, date_to } = req.query;
  let sql = 'SELECT * FROM bookings WHERE 1=1';
  const params = [];

  if (status) {
    sql += ' AND status = ?';
    params.push(status);
  }
  if (date_from) {
    sql += ' AND date >= ?';
    params.push(date_from);
  }
  if (date_to) {
    sql += ' AND date <= ?';
    params.push(date_to);
  }
  sql += ' ORDER BY date ASC, time ASC';

  const bookings = db.prepare(sql).all(...params);
  res.json(bookings);
});

// 更新预约状态
router.patch('/bookings/:id', authMiddleware, (req, res) => {
  const { id } = req.params;
  const { status, assigned_to, payment_status } = req.body;

  const updates = [];
  const params = [];

  if (status) {
    updates.push('status = ?');
    params.push(status);
  }
  if (assigned_to !== undefined) {
    updates.push('assigned_to = ?');
    params.push(assigned_to || null);
  }
  if (payment_status) {
    updates.push('payment_status = ?');
    params.push(payment_status);
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: '无有效更新' });
  }

  updates.push('updated_at = CURRENT_TIMESTAMP');
  params.push(id);

  db.prepare(`UPDATE bookings SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(id);
  res.json(booking);
});

// 发送确认短信/邮件给客户
router.post('/bookings/:id/notify', authMiddleware, async (req, res) => {
  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);
  if (!booking) return res.status(404).json({ error: '预约不存在' });

  const SERVICE_NAMES = { home: '家用空调清洗', commercial: '商用空调清洗', maintenance: '空调保养套餐' };
  const serviceName = SERVICE_NAMES[booking.service] || booking.service;

  // 可扩展：调用客户邮箱或短信接口
  console.log('通知客户:', booking.phone, '预约确认');
  res.json({ success: true, message: '通知已发送' });
});

module.exports = router;
