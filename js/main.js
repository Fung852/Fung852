/**
 * 快來洗 Chill Wash Services - 預約網站互動邏輯
 */

document.addEventListener('DOMContentLoaded', () => {
    initMobileMenu();
    initDatePicker();
    initBookingForm();
    initContactFromConfig();
});

function initContactFromConfig() {
    if (typeof SITE_CONFIG === 'undefined') return;
    const wa = document.getElementById('contactWhatsApp');
    if (wa) {
        wa.href = SITE_CONFIG.whatsappLink || wa.href;
        wa.textContent = SITE_CONFIG.whatsapp || wa.textContent;
    }
    const addr = document.getElementById('contactAddress');
    if (addr) addr.textContent = SITE_CONFIG.address || addr.textContent;
    const hours = document.getElementById('contactHours');
    if (hours) hours.textContent = SITE_CONFIG.serviceHours || hours.textContent;
}

// 移动端菜单
function initMobileMenu() {
    const menuBtn = document.querySelector('.mobile-menu-btn');
    const navLinks = document.querySelector('.nav-links');

    if (menuBtn && navLinks) {
        menuBtn.addEventListener('click', () => {
            navLinks.style.display = navLinks.style.display === 'flex' ? 'none' : 'flex';
            navLinks.classList.toggle('active');
        });
    }
}

// 日期选择器 - 限制只能选择今天及以后的日期
function initDatePicker() {
    const dateInput = document.getElementById('date');
    if (!dateInput) return;

    const today = new Date().toISOString().split('T')[0];
    dateInput.setAttribute('min', today);
}

// 预约表单
function initBookingForm() {
    const form = document.getElementById('bookingForm');
    const successMsg = document.getElementById('bookingSuccess');

    if (!form || !successMsg) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        // 简单验证
        if (!data.name?.trim() || !data.phone?.trim() || !data.service || !data.date || !data.time || !data.address?.trim()) {
            alert('請填寫所有必填欄位');
            return;
        }

        // 電話格式驗證（支援台灣、香港、大陸）
        const phone = data.phone.trim().replace(/\s/g, '');
        const phoneRegex = /^(\d{8,11}|09\d{8})$/;
        if (!phoneRegex.test(phone)) {
            alert('請輸入正確的聯絡電話');
            return;
        }
        data.phone = phone;

        // 显示加载状态
        const submitBtn = form.querySelector('.submit-btn');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = '提交中...';
        submitBtn.disabled = true;

        try {
            const apiBase = window.location.origin;
            const res = await fetch(apiBase + '/api/bookings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            const text = await res.text();
            let result;
            try {
                result = JSON.parse(text);
            } catch {
                throw new Error('伺服器回應異常，請確保已執行 npm start 啟動後端');
            }
            if (!res.ok) throw new Error(result.error || '提交失敗');

            form.style.display = 'none';
            successMsg.style.display = 'block';
            successMsg.scrollIntoView({ behavior: 'smooth' });

            // 可选：显示支付入口
            if (result.booking?.id) {
                showPaymentOption(result.booking);
            }
        } catch (error) {
            const useWhatsApp = confirm(
                '線上預約系統暫時無法連線。\n\n是否改為透過 WhatsApp 傳送預約資訊？\n（+852 6158 1857）'
            );
            if (useWhatsApp) {
                submitViaWhatsApp(data);
            } else {
                alert(error.message || '提交失敗，請稍後重試');
            }
        } finally {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    });
}

// API 失敗時改由 WhatsApp 提交
function submitViaWhatsApp(data) {
    const SERVICE_NAMES = { home: '家用冷氣清洗', commercial: '商用冷氣清洗', maintenance: '冷氣保養套餐' };
    const serviceName = SERVICE_NAMES[data.service] || data.service;
    const msg = `【CWS 快來洗 預約查詢】

姓名：${data.name}
電話：${data.phone}
服務：${serviceName}
數量：${data.units || 1} 台
日期：${data.date} ${data.time}
地址：${data.address}
${data.notes ? '備註：' + data.notes : ''}`;
    const waNum = (typeof SITE_CONFIG !== 'undefined' && SITE_CONFIG.whatsapp)
    ? SITE_CONFIG.whatsapp.replace(/\D/g, '')
    : '85261581857';
    const url = 'https://wa.me/' + waNum + '?text=' + encodeURIComponent(msg);
    window.open(url, '_blank');
    // 仍顯示成功區塊，提示用戶已開啟 WhatsApp
    document.getElementById('bookingForm').style.display = 'none';
    document.getElementById('bookingSuccess').style.display = 'block';
    document.getElementById('bookingSuccess').querySelector('p').textContent =
        '已為您開啟 WhatsApp，請將預約資訊傳送給我們，我們會儘快回覆！';
    document.getElementById('bookingSuccess').scrollIntoView({ behavior: 'smooth' });
}

// 显示支付入口
function showPaymentOption(booking) {
    const section = document.getElementById('paymentSection');
    const btn = document.getElementById('btnPayNow');
    if (!section || !btn) return;

    section.style.display = 'block';
    btn.onclick = () => initiatePayment(booking.id);
}

// 发起支付（Stripe - 需在 .env 配置 STRIPE_SECRET_KEY 和前端 STRIPE_PUBLISHABLE_KEY）
async function initiatePayment(bookingId) {
    const btn = document.getElementById('btnPayNow');
    if (btn) {
        btn.disabled = true;
        btn.textContent = '處理中...';
    }
    try {
        const res = await fetch(window.location.origin + '/api/payment/create-intent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bookingId }),
        });
        const text = await res.text();
        let data;
        try {
            data = JSON.parse(text);
        } catch {
            alert('支付服務異常，請確保已執行 npm start 啟動後端');
            return;
        }
        if (!res.ok) {
            alert(data.message || data.error || '支付暫不可用，請到店支付');
            return;
        }
        // Stripe 支付：需加载 Stripe.js 并调用 confirmCardPayment(clientSecret)
        // 配置后可使用: https://stripe.com/docs/payments/accept-a-payment
        if (data.clientSecret && window.Stripe) {
            const stripe = window.Stripe(window.STRIPE_PUBLISHABLE_KEY);
            const { error } = await stripe.confirmCardPayment(data.clientSecret);
            if (error) alert(error.message || '支付取消');
            else alert('支付成功！');
        } else {
            alert('支付功能需配置 Stripe 後使用。您可先到店支付，或聯繫客服。');
        }
    } catch (e) {
        alert('支付請求失敗，請到店支付。');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = '立即支付';
        }
    }
}
