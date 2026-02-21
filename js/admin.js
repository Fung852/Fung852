/**
 * 管理后台逻辑
 */
const API_BASE = window.location.origin + '/api';

let token = localStorage.getItem('admin_token');

const SERVICE_NAMES = { home: '家用', commercial: '商用', maintenance: '保養' };
const STATUS_NAMES = { pending: '待確認', confirmed: '已確認', completed: '已完成', cancelled: '已取消' };

function showPage(page) {
  document.getElementById('loginPage').style.display = page === 'login' ? 'flex' : 'none';
  document.getElementById('adminPage').style.display = page === 'admin' ? 'block' : 'none';
}

function api(path, options = {}) {
  const url = API_BASE + path;
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = 'Bearer ' + token;
  return fetch(url, { ...options, headers }).then(async (r) => {
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.error || '請求失敗');
    return data;
  });
}

// 登录
document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  try {
    const { token: t } = await api('/admin/login', {
      method: 'POST',
      body: JSON.stringify({ username: fd.get('username'), password: fd.get('password') }),
    });
    token = t;
    localStorage.setItem('admin_token', token);
    showPage('admin');
    loadBookings();
  } catch (err) {
    alert(err.message);
  }
});

// 退出
document.getElementById('btnLogout')?.addEventListener('click', () => {
  token = null;
  localStorage.removeItem('admin_token');
  showPage('login');
});

// 加载预约列表
let bookingsCache = [];

async function loadBookings() {
  const status = document.getElementById('filterStatus').value;
  const dateFrom = document.getElementById('filterDateFrom').value;
  const dateTo = document.getElementById('filterDateTo').value;
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (dateFrom) params.set('date_from', dateFrom);
  if (dateTo) params.set('date_to', dateTo);

  const bookings = await api('/admin/bookings?' + params);
  bookingsCache = bookings;
  renderBookings(bookings);
}

function renderBookings(list) {
  const tbody = document.getElementById('bookingsBody');
  tbody.innerHTML = list.length
    ? list
        .map(
          (b) => `
    <tr>
      <td>${b.id}</td>
      <td>${b.name}</td>
      <td>${b.phone}</td>
      <td>${SERVICE_NAMES[b.service] || b.service}</td>
      <td>${b.units}</td>
      <td>${b.date} ${b.time}</td>
      <td>${b.address}</td>
      <td><span class="status-badge status-${b.status}">${STATUS_NAMES[b.status] || b.status}</span></td>
      <td class="${b.payment_status === 'paid' ? 'payment-paid' : 'payment-unpaid'}">${b.payment_status === 'paid' ? '已支付' : '未支付'}</td>
      <td><button class="btn-edit" data-id="${b.id}">編輯</button></td>
    </tr>
  `
        )
        .join('')
    : '<tr><td colspan="10" style="text-align:center;padding:40px;">暫無預約</td></tr>';

  tbody.querySelectorAll('.btn-edit').forEach((btn) => {
    btn.addEventListener('click', () => openEditModal(btn.dataset.id));
  });
}

function openEditModal(id) {
  const booking = bookingsCache.find((x) => String(x.id) === String(id));
  if (!booking) return;
  document.getElementById('editId').value = booking.id;
  document.getElementById('editStatus').value = booking.status;
  document.getElementById('editAssigned').value = booking.assigned_to || '';
  document.getElementById('editPayment').value = booking.payment_status || 'unpaid';
  document.getElementById('editModal').style.display = 'flex';
}

function closeEditModal() {
  document.getElementById('editModal').style.display = 'none';
}

document.getElementById('btnCloseModal')?.addEventListener('click', closeEditModal);

document.getElementById('editForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('editId').value;
  const status = document.getElementById('editStatus').value;
  const assigned_to = document.getElementById('editAssigned').value;
  const payment_status = document.getElementById('editPayment').value;

  await api(`/admin/bookings/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status, assigned_to, payment_status }),
  });

  closeEditModal();
  loadBookings();
});

document.getElementById('btnRefresh')?.addEventListener('click', loadBookings);
document.getElementById('filterStatus')?.addEventListener('change', loadBookings);
document.getElementById('filterDateFrom')?.addEventListener('change', loadBookings);
document.getElementById('filterDateTo')?.addEventListener('change', loadBookings);

// 初始化
if (token) {
  api('/admin/bookings')
    .then(() => {
      showPage('admin');
      loadBookings();
    })
    .catch(() => {
      token = null;
      localStorage.removeItem('admin_token');
      showPage('login');
    });
} else {
  showPage('login');
}
