#!/usr/bin/env node
/**
 * 重設管理員密碼
 * 用法: node scripts/reset-admin.js
 * 或: node scripts/reset-admin.js [新密碼]
 */
const path = require('path');
const crypto = require('crypto');
const Database = require('better-sqlite3');

const dbPath = path.join(__dirname, '..', 'data', 'bookings.db');
const db = new Database(dbPath);

const password = process.argv[2] || 'admin123';
const hash = crypto.createHash('sha256').update(password).digest('hex');

const existing = db.prepare('SELECT id FROM admin_users WHERE username = ?').get('admin');
if (existing) {
  db.prepare('UPDATE admin_users SET password_hash = ? WHERE username = ?').run(hash, 'admin');
  console.log('已重設 admin 密碼為:', password);
} else {
  db.prepare('INSERT INTO admin_users (username, password_hash) VALUES (?, ?)').run('admin', hash);
  console.log('已建立 admin 帳號，密碼:', password);
}
db.close();
