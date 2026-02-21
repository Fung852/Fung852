# 清风空调清洗 - 预约系统

专业空调清洗服务在线预约系统，含前端预约、后端 API、管理后台、通知与支付集成。

## 功能特点

- **前端预约**：服务展示、在线预约表单、响应式设计
- **后端 API**：预约数据写入 SQLite 数据库
- **管理后台**：查看工单、筛选、更新状态、指派技师、支付状态
- **通知**：邮件通知（SMTP）、短信占位（可对接阿里云/腾讯云）
- **支付**：Stripe 在线支付（可选配置）

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量（可选）

```bash
cp .env.example .env
# 编辑 .env 配置邮件、支付等
```

### 3. 启动服务

```bash
npm start
```

访问：
- 预约网站：http://localhost:3000
- 管理后台：http://localhost:3000/admin.html（默认账号 admin / admin123）

## 项目结构

```
├── index.html          # 预约首页
├── admin.html          # 管理后台
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

- **公司名称**：在 `index.html` 中搜索「清风空调清洗」替换
- **联系方式**：修改「联系我们」区块
- **服务价格**：在 `server/routes/payment.js` 的 `SERVICE_PRICES` 中调整
- **配色**：在 `css/styles.css` 的 `:root` 中修改

## 许可证

MIT
