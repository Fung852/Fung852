# 快來洗 Chill Wash Services - 預約系統

專業冷氣清洗服務線上預約系統，含前端預約、後端 API、管理後台、通知與支付整合。

## 功能特點

- **前端預約**：服務展示、線上預約表單、響應式設計
- **後端 API**：預約資料寫入 SQLite 資料庫
- **管理後台**：查看工單、篩選、更新狀態、指派技師、支付狀態
- **通知**：郵件通知（SMTP）、簡訊佔位（可對接阿里雲/騰訊雲）
- **支付**：Stripe 線上支付（可選配置）
- **價格**：每台冷氣 $500

## 快速開始

### 1. 安裝依賴

```bash
npm install
```

### 2. 設定環境變數（可選）

```bash
cp .env.example .env
# 編輯 .env 設定郵件、支付等
```

### 3. 啟動服務

```bash
npm start
```

存取：
- 預約網站：http://localhost:3000
- 管理後台：http://localhost:3000/admin.html（預設帳號 admin / admin123）

## 專案結構

```
├── index.html          # 預約首頁
├── admin.html          # 管理後台
├── css/
│   ├── styles.css      # 主站样式
│   └── admin.css       # 后台样式
├── js/
│   ├── main.js         # 预约逻辑
│   └── admin.js        # 后台逻辑
├── server/
│   ├── index.js        # 服务入口
│   ├── db.js           # 数据库
│   ├── routes/
│   │   ├── bookings.js # 预约 API
│   │   ├── admin.js    # 管理 API
│   │   └── payment.js  # 支付 API
│   └── services/
│       └── notification.js  # 邮件/短信
├── data/
│   └── bookings.db     # SQLite 数据库（自动创建）
└── .env.example        # 环境变量示例
```

## API 说明

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/bookings | 提交预约 |
| POST | /api/admin/login | 管理员登录 |
| GET | /api/admin/bookings | 获取预约列表（需登录） |
| PATCH | /api/admin/bookings/:id | 更新预约状态（需登录） |
| POST | /api/payment/create-intent | 创建支付（Stripe） |
| GET | /api/payment/status/:bookingId | 查询支付状态 |

## 配置说明

### 邮件通知

在 `.env` 中配置 SMTP：

```
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your@email.com
SMTP_PASS=password
NOTIFY_EMAIL=admin@example.com  # 新预约通知到此邮箱
```

### 短信通知

在 `server/services/notification.js` 中对接阿里云、腾讯云等短信 API，并配置 `SMS_API_KEY`。

### Stripe 支付

1. 注册 [Stripe](https://stripe.com)
2. 在 `.env` 中配置 `STRIPE_SECRET_KEY`、`STRIPE_PUBLISHABLE_KEY`
3. 前端引入 Stripe.js 并设置 `window.STRIPE_PUBLISHABLE_KEY`
4. 配置 Webhook：`/api/payment/webhook`，用于支付成功回调

### 国内支付（微信/支付宝）

需申请商户号并接入对应 SDK，可参考官方文档替换 `server/routes/payment.js` 中的 Stripe 逻辑。

## 自定义配置

- **網站網址**：在 `js/config.js` 修改 `siteUrl`（預設 https://www.chillwashservice.com）
- **公司名稱**：快來洗 Chill Wash Services
- **聯絡方式**：在 `js/config.js` 修改 WhatsApp、服務時間、地址
- **服務價格**：在 `server/routes/payment.js` 的 `SERVICE_PRICES` 中調整（預設 $500/台）
- **配色**：在 `css/styles.css` 的 `:root` 中修改

## 许可证

MIT
