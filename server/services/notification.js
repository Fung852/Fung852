/**
 * 通知服务 - 邮件与短信
 */
const nodemailer = require('nodemailer');

const SERVICE_NAMES = {
  home: '家用冷氣清洗',
  commercial: '商用冷氣清洗',
  maintenance: '冷氣保養套餐',
};

// 邮件配置 (需在 .env 中设置)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.example.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function sendEmail(to, subject, html) {
  if (!process.env.SMTP_USER) {
    console.log('[邮件] 未配置 SMTP，跳过发送:', subject);
    return;
  }
  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject,
    html,
  });
}

async function sendSMS(phone, message) {
  // 短信需对接阿里云/腾讯云等，此处为占位
  if (!process.env.SMS_API_KEY) {
    console.log('[短信] 未配置短信服务，跳过发送:', phone);
    return;
  }
  // TODO: 接入实际短信 API
  console.log('[短信] 模拟发送:', phone, message);
}

async function sendBookingConfirmation(booking) {
  const serviceName = SERVICE_NAMES[booking.service] || booking.service;

  // 邮件通知 (如有配置邮箱)
  if (process.env.NOTIFY_EMAIL) {
    const html = `
      <h2>新預約通知</h2>
      <p><strong>客戶:</strong> ${booking.name}</p>
      <p><strong>電話:</strong> ${booking.phone}</p>
      <p><strong>服務:</strong> ${serviceName}</p>
      <p><strong>數量:</strong> ${booking.units} 台</p>
      <p><strong>日期:</strong> ${booking.date} ${booking.time}</p>
      <p><strong>地址:</strong> ${booking.address}</p>
      ${booking.notes ? `<p><strong>備註:</strong> ${booking.notes}</p>` : ''}
    `;
    await sendEmail(process.env.NOTIFY_EMAIL, `新預約 - ${booking.name}`, html);
  }

  // 短信通知客户 (需配置 SMS_API_KEY)
  const smsContent = `【CWS 快來洗】您已成功預約${serviceName}，服務日期${booking.date} ${booking.time}。我們將儘快與您確認，感謝！WhatsApp +852 61581857`;
  await sendSMS(booking.phone, smsContent);
}

module.exports = { sendBookingConfirmation, sendEmail, sendSMS };
