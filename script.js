const STORAGE_KEY = "ffxiv-accounts";

const form = document.getElementById("account-form");
const nameInput = document.getElementById("account-name");
const accountExpiryInput = document.getElementById("account-expiry");
const sameAsAccountCheckbox = document.getElementById("same-as-account");
const employeeExpiryField = document.getElementById("employee-expiry-field");
const employeeExpiryInput = document.getElementById("employee-expiry");
const accountList = document.getElementById("account-list");

let editingId = null;

function loadAccounts() {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
}

function saveAccounts(accounts) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
}

function daysUntil(dateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + "T00:00:00");
  return Math.round((target - today) / (1000 * 60 * 60 * 24));
}

function statusClassFor(days) {
  if (days < 0) return "status-danger";
  if (days <= 3) return "status-danger";
  if (days <= 7) return "status-warn";
  return "";
}

function formatDaysLabel(days) {
  if (days < 0) return `已過期 ${Math.abs(days)} 天`;
  if (days === 0) return "今天到期";
  return `還剩 ${days} 天`;
}

function formatDate(dateStr) {
  const [y, m, d] = dateStr.split("-");
  return `${y}/${m}/${d}`;
}

function renderAccounts() {
  const accounts = loadAccounts();
  accountList.innerHTML = "";

  if (accounts.length === 0) {
    accountList.innerHTML = '<li class="empty-state">還沒有帳號資料，新增一筆看看吧</li>';
    return;
  }

  const sorted = [...accounts].sort((a, b) => {
    const soonestA = Math.min(daysUntil(a.accountExpiry), daysUntil(a.employeeExpiry));
    const soonestB = Math.min(daysUntil(b.accountExpiry), daysUntil(b.employeeExpiry));
    return soonestA - soonestB;
  });

  for (const acc of sorted) {
    const accDays = daysUntil(acc.accountExpiry);
    const empDays = daysUntil(acc.employeeExpiry);
    const worstDays = Math.min(accDays, empDays);

    const li = document.createElement("li");
    li.className = `account-card ${statusClassFor(worstDays)}`.trim();
    li.innerHTML = `
      <div class="account-card-header">
        <span class="account-name">${escapeHtml(acc.name)}</span>
      </div>
      <div class="account-dates">
        <div>帳號到期日：${formatDate(acc.accountExpiry)}（<span class="days-left">${formatDaysLabel(accDays)}</span>）</div>
        <div>雇員到期日：${formatDate(acc.employeeExpiry)}（<span class="days-left">${formatDaysLabel(empDays)}</span>）</div>
      </div>
      <div class="account-actions">
        <button class="btn-icon" data-action="edit" data-id="${acc.id}">編輯</button>
        <button class="btn-icon danger" data-action="delete" data-id="${acc.id}">刪除</button>
      </div>
    `;
    accountList.appendChild(li);
  }
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function resetForm() {
  form.reset();
  employeeExpiryField.classList.remove("is-hidden");
  editingId = null;
  form.querySelector(".btn-primary").textContent = "新增帳號";
}

sameAsAccountCheckbox.addEventListener("change", () => {
  if (sameAsAccountCheckbox.checked) {
    employeeExpiryInput.value = accountExpiryInput.value;
    employeeExpiryField.classList.add("is-hidden");
  } else {
    employeeExpiryField.classList.remove("is-hidden");
  }
});

accountExpiryInput.addEventListener("change", () => {
  if (sameAsAccountCheckbox.checked) {
    employeeExpiryInput.value = accountExpiryInput.value;
  }
});

form.addEventListener("submit", (e) => {
  e.preventDefault();

  const name = nameInput.value.trim();
  const accountExpiry = accountExpiryInput.value;
  const employeeExpiry = sameAsAccountCheckbox.checked
    ? accountExpiry
    : employeeExpiryInput.value;

  if (!name || !accountExpiry || !employeeExpiry) return;

  const accounts = loadAccounts();

  if (editingId) {
    const idx = accounts.findIndex((a) => a.id === editingId);
    if (idx !== -1) {
      accounts[idx] = { ...accounts[idx], name, accountExpiry, employeeExpiry };
    }
  } else {
    accounts.push({
      id: crypto.randomUUID(),
      name,
      accountExpiry,
      employeeExpiry,
    });
  }

  saveAccounts(accounts);
  resetForm();
  renderAccounts();
});

accountList.addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-action]");
  if (!btn) return;

  const id = btn.dataset.id;
  const accounts = loadAccounts();

  if (btn.dataset.action === "delete") {
    if (!confirm("確定要刪除這筆帳號資料嗎？")) return;
    saveAccounts(accounts.filter((a) => a.id !== id));
    renderAccounts();
  }

  if (btn.dataset.action === "edit") {
    const acc = accounts.find((a) => a.id === id);
    if (!acc) return;
    editingId = id;
    nameInput.value = acc.name;
    accountExpiryInput.value = acc.accountExpiry;
    const isSame = acc.accountExpiry === acc.employeeExpiry;
    sameAsAccountCheckbox.checked = isSame;
    employeeExpiryInput.value = acc.employeeExpiry;
    employeeExpiryField.classList.toggle("is-hidden", isSame);
    form.querySelector(".btn-primary").textContent = "儲存變更";
    form.scrollIntoView({ behavior: "smooth" });
  }
});

// Tab navigation
document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    if (btn.disabled) return;
    document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("is-active"));
    document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("is-active"));
    btn.classList.add("is-active");
    document.getElementById(`tab-${btn.dataset.tab}`).classList.add("is-active");
  });
});

renderAccounts();
