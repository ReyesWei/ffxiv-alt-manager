const STORAGE_KEY = "ffxiv-accounts";

const form = document.getElementById("account-form");
const nameInput = document.getElementById("account-name");
const accountExpiryInput = document.getElementById("account-expiry");
const sameAsAccountCheckbox = document.getElementById("same-as-account");
const employeeExpiryField = document.getElementById("employee-expiry-field");
const employeeExpiryInput = document.getElementById("employee-expiry");
const accountList = document.getElementById("account-list");
const accountDialog = document.getElementById("account-dialog");
const dialogTitle = document.getElementById("dialog-title");
const openAddAccountBtn = document.getElementById("open-add-account");
const closeDialogBtn = document.getElementById("close-dialog");

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
  dialogTitle.textContent = "新增帳號";
  form.querySelector(".btn-primary").textContent = "新增帳號";
}

openAddAccountBtn.addEventListener("click", () => {
  resetForm();
  accountDialog.showModal();
});

closeDialogBtn.addEventListener("click", () => {
  accountDialog.close();
});

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
  accountDialog.close();
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
    dialogTitle.textContent = "編輯帳號";
    form.querySelector(".btn-primary").textContent = "儲存變更";
    accountDialog.showModal();
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

/* ---------- Submarines ---------- */

const CATEGORY_KEY = "ffxiv-sub-categories";
const SUBMARINE_KEY = "ffxiv-submarines";

const categoryDialog = document.getElementById("category-dialog");
const categoryForm = document.getElementById("category-form");
const categoryNameInput = document.getElementById("category-name");
const openAddCategoryBtn = document.getElementById("open-add-category");
const closeCategoryDialogBtn = document.getElementById("close-category-dialog");
const categoryPillsEl = document.getElementById("category-pills");
const currentCategoryLabel = document.getElementById("current-category-label");

const submarineDialog = document.getElementById("submarine-dialog");
const submarineForm = document.getElementById("submarine-form");
const submarineDurationInput = document.getElementById("submarine-duration");
const openAddSubmarineBtn = document.getElementById("open-add-submarine");
const closeSubmarineDialogBtn = document.getElementById("close-submarine-dialog");
const submarineListEl = document.getElementById("submarine-list");

let selectedCategoryId = null;
const notifiedIds = new Set();

function loadCategories() {
  const raw = localStorage.getItem(CATEGORY_KEY);
  return raw ? JSON.parse(raw) : [];
}

function saveCategories(categories) {
  localStorage.setItem(CATEGORY_KEY, JSON.stringify(categories));
}

function loadSubmarines() {
  const raw = localStorage.getItem(SUBMARINE_KEY);
  return raw ? JSON.parse(raw) : [];
}

function saveSubmarines(submarines) {
  localStorage.setItem(SUBMARINE_KEY, JSON.stringify(submarines));
}

function parseDurationCode(code) {
  const digits = code.replace(/\D/g, "");
  let days = 0, hours = 0, minutes = 0;

  if (digits.length === 2) {
    minutes = Number(digits);
  } else if (digits.length === 4) {
    hours = Number(digits.slice(0, 2));
    minutes = Number(digits.slice(2));
  } else if (digits.length === 6) {
    days = Number(digits.slice(0, 2));
    hours = Number(digits.slice(2, 4));
    minutes = Number(digits.slice(4));
  } else {
    return null;
  }

  if (minutes > 59 || hours > 23) return null;

  return (days * 24 * 60 + hours * 60 + minutes) * 60000;
}

function renderCategoryPills() {
  const categories = loadCategories();
  categoryPillsEl.innerHTML = "";

  if (categories.length === 0) {
    selectedCategoryId = null;
    currentCategoryLabel.textContent = "請先新增分類";
    openAddSubmarineBtn.disabled = true;
    renderSubmarines();
    return;
  }

  if (!categories.some((c) => c.id === selectedCategoryId)) {
    selectedCategoryId = categories[0].id;
  }

  for (const cat of categories) {
    const pill = document.createElement("button");
    pill.type = "button";
    pill.className = `category-pill ${cat.id === selectedCategoryId ? "is-active" : ""}`.trim();
    pill.dataset.id = cat.id;
    pill.innerHTML = `<span>${escapeHtml(cat.name)}</span><span class="remove-category" data-remove-id="${cat.id}">✕</span>`;
    categoryPillsEl.appendChild(pill);
  }

  const selected = categories.find((c) => c.id === selectedCategoryId);
  currentCategoryLabel.textContent = `${selected.name} 的潛水艇`;
  openAddSubmarineBtn.disabled = false;
  renderSubmarines();
}

function formatRemaining(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  let label = "還剩 ";
  if (days > 0) label += `${days}天`;
  if (days > 0 || hours > 0) label += `${hours}小時`;
  label += `${minutes}分${seconds}秒`;
  return label;
}

function renderSubmarines() {
  submarineListEl.innerHTML = "";

  if (!selectedCategoryId) return;

  const subs = loadSubmarines()
    .filter((s) => s.categoryId === selectedCategoryId)
    .sort((a, b) => a.returnAt - b.returnAt);

  if (subs.length === 0) {
    submarineListEl.innerHTML = '<li class="empty-state">這個分類還沒有潛水艇，手動新增一筆吧</li>';
    return;
  }

  subs.forEach((sub, index) => {
    const li = document.createElement("li");
    li.className = "submarine-card";
    li.dataset.id = sub.id;
    li.innerHTML = `
      <div class="submarine-info">
        <span class="submarine-label">潛水艇 ${index + 1}</span>
        <span class="submarine-countdown" data-return-at="${sub.returnAt}"></span>
      </div>
      <button class="btn-icon danger" data-action="delete-submarine" data-id="${sub.id}">刪除</button>
    `;
    submarineListEl.appendChild(li);
  });

  tickCountdowns();
}

let sharedAudioCtx = null;
document.addEventListener(
  "click",
  () => {
    if (!sharedAudioCtx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (Ctx) sharedAudioCtx = new Ctx();
    } else if (sharedAudioCtx.state === "suspended") {
      sharedAudioCtx.resume();
    }
  },
  { once: false }
);

function playAlertSound() {
  if (!sharedAudioCtx) return;
  const now = sharedAudioCtx.currentTime;
  for (let i = 0; i < 3; i++) {
    const osc = sharedAudioCtx.createOscillator();
    const gain = sharedAudioCtx.createGain();
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.0001, now + i * 0.4);
    gain.gain.exponentialRampToValueAtTime(0.3, now + i * 0.4 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.4 + 0.3);
    osc.connect(gain);
    gain.connect(sharedAudioCtx.destination);
    osc.start(now + i * 0.4);
    osc.stop(now + i * 0.4 + 0.35);
  }
}

function tickCountdowns() {
  document.querySelectorAll(".submarine-countdown").forEach((el) => {
    const returnAt = Number(el.dataset.returnAt);
    const remaining = returnAt - Date.now();
    const card = el.closest(".submarine-card");

    if (remaining <= 0) {
      el.textContent = "已回港！";
      card.classList.add("is-arrived");
      if (!notifiedIds.has(card.dataset.id)) {
        notifiedIds.add(card.dataset.id);
        playAlertSound();
      }
    } else {
      el.textContent = formatRemaining(remaining);
      card.classList.remove("is-arrived");
    }
  });
}

setInterval(tickCountdowns, 1000);

openAddCategoryBtn.addEventListener("click", () => {
  categoryForm.reset();
  categoryDialog.showModal();
});

closeCategoryDialogBtn.addEventListener("click", () => {
  categoryDialog.close();
});

categoryForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const name = categoryNameInput.value.trim();
  if (!name) return;

  const categories = loadCategories();
  const newCategory = { id: crypto.randomUUID(), name };
  categories.push(newCategory);
  saveCategories(categories);

  selectedCategoryId = newCategory.id;
  categoryDialog.close();
  categoryForm.reset();
  renderCategoryPills();
});

categoryPillsEl.addEventListener("click", (e) => {
  const removeBtn = e.target.closest("[data-remove-id]");
  if (removeBtn) {
    e.stopPropagation();
    if (!confirm("確定要刪除這個分類嗎？底下的潛水艇資料也會一併刪除")) return;
    const removeId = removeBtn.dataset.removeId;
    saveCategories(loadCategories().filter((c) => c.id !== removeId));
    saveSubmarines(loadSubmarines().filter((s) => s.categoryId !== removeId));
    if (selectedCategoryId === removeId) selectedCategoryId = null;
    renderCategoryPills();
    return;
  }

  const pill = e.target.closest(".category-pill");
  if (pill) {
    selectedCategoryId = pill.dataset.id;
    renderCategoryPills();
  }
});

openAddSubmarineBtn.addEventListener("click", () => {
  if (!selectedCategoryId) return;
  submarineForm.reset();
  submarineDialog.showModal();
  submarineDurationInput.focus();
});

closeSubmarineDialogBtn.addEventListener("click", () => {
  submarineDialog.close();
});

submarineForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const code = submarineDurationInput.value.trim();
  const ms = parseDurationCode(code);

  if (ms === null || ms <= 0) {
    alert("請輸入正確格式：2碼（分）、4碼（時分）或 6碼（日時分）的數字");
    return;
  }

  const submarines = loadSubmarines();
  submarines.push({
    id: crypto.randomUUID(),
    categoryId: selectedCategoryId,
    returnAt: Date.now() + ms,
  });
  saveSubmarines(submarines);

  submarineDialog.close();
  submarineForm.reset();
  renderSubmarines();
});

submarineListEl.addEventListener("click", (e) => {
  const btn = e.target.closest('button[data-action="delete-submarine"]');
  if (!btn) return;
  if (!confirm("確定要刪除這艘潛水艇的倒數嗎？")) return;
  saveSubmarines(loadSubmarines().filter((s) => s.id !== btn.dataset.id));
  renderSubmarines();
});

renderCategoryPills();
