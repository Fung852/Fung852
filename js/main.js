/**
 * 清风空调清洗 - 预约网站交互逻辑
 */

document.addEventListener('DOMContentLoaded', () => {
    initMobileMenu();
    initDatePicker();
    initBookingForm();
});

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
            alert('请填写所有必填项');
            return;
        }

        // 手机号简单验证
        const phoneRegex = /^1[3-9]\d{9}$/;
        if (!phoneRegex.test(data.phone.trim())) {
            alert('请输入正确的手机号码');
            return;
        }

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
            const result = await res.json();
            if (!res.ok) throw new Error(result.error || '提交失败');

            form.style.display = 'none';
            successMsg.style.display = 'block';
            successMsg.scrollIntoView({ behavior: 'smooth' });

            // 可选：显示支付入口
            if (result.booking?.id) {
                showPaymentOption(result.booking);
            }
        } catch (error) {
            alert(error.message || '提交失败，请稍后重试');
        } finally {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    });
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
        btn.textContent = '处理中...';
    }
    try {
        const res = await fetch(window.location.origin + '/api/payment/create-intent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bookingId }),
        });
        const data = await res.json();
        if (!res.ok) {
            alert(data.message || data.error || '支付暂不可用，请到店支付');
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
            alert('支付功能需配置 Stripe 后使用。您可先到店支付，或联系客服。');
        }
    } catch (e) {
        alert('支付请求失败，请到店支付。');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = '立即支付';
        }
    }
}
