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
            // 这里可以对接后端 API，目前模拟提交成功
            await new Promise(resolve => setTimeout(resolve, 800));

            form.style.display = 'none';
            successMsg.style.display = 'block';
            successMsg.scrollIntoView({ behavior: 'smooth' });

            // 控制台输出预约信息（便于调试，实际应发送到后端）
            console.log('预约信息:', data);
        } catch (error) {
            alert('提交失败，请稍后重试');
        } finally {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    });
}
