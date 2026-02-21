/**
 * 数据库初始化
 */
const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '..', 'data', 'bookings.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    service TEXT NOT NULL,
    units INTEGER DEFAULT 1,
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    address TEXT NOT NULL,
    notes TEXT,
    status TEXT DEFAULT 'pending',
    assigned_to TEXT,
    payment_status TEXT DEFAULT 'unpaid',
    payment_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS admin_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
  CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(date);
`);

// 默认管理员 (用户名: admin, 密码: admin123)
const crypto = require('crypto');
const defaultAdmin = { username: 'admin', password: 'admin123' };
const existing = db.prepare('SELECT id FROM admin_users WHERE username = ?').get(defaultAdmin.username);
if (!existing) {
  const hash = crypto.createHash('sha256').update(defaultAdmin.password).digest('hex');
  db.prepare('INSERT INTO admin_users (username, password_hash) VALUES (?, ?)').run(defaultAdmin.username, hash);
}

module.exports = db;
