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

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
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

// Sidebar accordion
const accordionToggle = document.getElementById("accounts-accordion-toggle");
const accordionBody = document.getElementById("accounts-accordion-body");

accordionToggle.addEventListener("click", () => {
  const isOpen = accordionToggle.classList.toggle("is-open");
  accordionBody.classList.toggle("is-collapsed", !isOpen);
});

renderAccounts();

/* ---------- Submarines ---------- */

const CATEGORY_KEY = "ffxiv-sub-categories";
const SUBMARINE_KEY = "ffxiv-submarines";
const ALL_CATEGORIES = "__all__";

const categoryDialog = document.getElementById("category-dialog");
const categoryForm = document.getElementById("category-form");
const categoryNameInput = document.getElementById("category-name");
const closeCategoryDialogBtn = document.getElementById("close-category-dialog");
const categoryPillsEl = document.getElementById("category-pills");

const submarineDialog = document.getElementById("submarine-dialog");
const submarineForm = document.getElementById("submarine-form");
const submarineDurationInput = document.getElementById("submarine-duration");
const openAddSubmarineBtn = document.getElementById("open-add-submarine");
const closeSubmarineDialogBtn = document.getElementById("close-submarine-dialog");
const submarineListEl = document.getElementById("submarine-list");

let selectedCategoryId = ALL_CATEGORIES;
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

function categoryNameById(id) {
  const cat = loadCategories().find((c) => c.id === id);
  return cat ? cat.name : "未分類";
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

function indexToLetter(n) {
  let label = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    label = String.fromCharCode(65 + rem) + label;
    n = Math.floor((n - 1) / 26);
  }
  return label;
}

function formatClock(ts) {
  const d = new Date(ts);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${mm}/${dd} ${hh}:${mi}`;
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

function renderCategoryPills() {
  const categories = loadCategories();
  categoryPillsEl.innerHTML = "";

  const allPill = document.createElement("button");
  allPill.type = "button";
  allPill.className = `category-pill ${selectedCategoryId === ALL_CATEGORIES ? "is-active" : ""}`.trim();
  allPill.dataset.id = ALL_CATEGORIES;
  allPill.textContent = "全部";
  categoryPillsEl.appendChild(allPill);

  for (const cat of categories) {
    const pill = document.createElement("button");
    pill.type = "button";
    pill.className = `category-pill ${cat.id === selectedCategoryId ? "is-active" : ""}`.trim();
    pill.dataset.id = cat.id;
    pill.innerHTML = `<span>${escapeHtml(cat.name)}</span><span class="remove-category" data-remove-id="${cat.id}">✕</span>`;
    categoryPillsEl.appendChild(pill);
  }

  const addPill = document.createElement("button");
  addPill.type = "button";
  addPill.className = "category-pill is-add";
  addPill.dataset.action = "add-category";
  addPill.textContent = "＋ 新增分類";
  categoryPillsEl.appendChild(addPill);

  openAddSubmarineBtn.disabled = selectedCategoryId === ALL_CATEGORIES;

  renderSubmarines();
}

function renderSubmarines() {
  submarineListEl.innerHTML = "";

  const categories = loadCategories();
  const all = loadSubmarines();
  const subs = (selectedCategoryId === ALL_CATEGORIES
    ? all
    : all.filter((s) => s.categoryId === selectedCategoryId)
  ).sort((a, b) => a.returnAt - b.returnAt);

  if (categories.length === 0) {
    submarineListEl.innerHTML = '<li class="empty-state">請先新增分類，再手動新增潛水艇</li>';
    return;
  }

  if (subs.length === 0) {
    submarineListEl.innerHTML = '<li class="empty-state">目前沒有潛水艇資料，選一個分類手動新增吧</li>';
    return;
  }

  const countByCategory = {};

  for (const sub of subs) {
    countByCategory[sub.categoryId] = (countByCategory[sub.categoryId] || 0) + 1;
    const index = countByCategory[sub.categoryId];

    const li = document.createElement("li");
    li.className = "submarine-card";
    li.dataset.id = sub.id;
    li.innerHTML = `
      <div class="submarine-card-header">
        <div class="submarine-title">
          <span class="category-badge">${escapeHtml(categoryNameById(sub.categoryId))}</span>
          <span class="submarine-name">潛水艇 ${indexToLetter(index)}</span>
        </div>
        <span class="submarine-status">探索中</span>
      </div>
      <div class="progress-track"><div class="progress-fill" style="width:0%"></div></div>
      <div class="submarine-times">
        <span>出航：${formatClock(sub.departedAt)}</span>
        <span>回港：<b>${formatClock(sub.returnAt)}</b></span>
      </div>
      <div class="submarine-card-footer">
        <span class="submarine-countdown" data-departed-at="${sub.departedAt}" data-return-at="${sub.returnAt}"></span>
        <button class="btn-icon danger" data-action="delete-submarine" data-id="${sub.id}">刪除</button>
      </div>
    `;
    submarineListEl.appendChild(li);
  }

  tickCountdowns();
}

let sharedAudioCtx = null;
document.addEventListener("click", () => {
  if (!sharedAudioCtx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (Ctx) sharedAudioCtx = new Ctx();
  } else if (sharedAudioCtx.state === "suspended") {
    sharedAudioCtx.resume();
  }
});

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
  document.querySelectorAll(".submarine-card").forEach((card) => {
    const countdownEl = card.querySelector(".submarine-countdown");
    if (!countdownEl) return;

    const departedAt = Number(countdownEl.dataset.departedAt);
    const returnAt = Number(countdownEl.dataset.returnAt);
    const now = Date.now();
    const remaining = returnAt - now;
    const totalMs = returnAt - departedAt;
    const progressFill = card.querySelector(".progress-fill");
    const statusEl = card.querySelector(".submarine-status");

    if (remaining <= 0) {
      countdownEl.textContent = "已回港！";
      if (statusEl) statusEl.textContent = "已回港！";
      card.classList.add("is-arrived");
      if (progressFill) progressFill.style.width = "100%";
      if (!notifiedIds.has(card.dataset.id)) {
        notifiedIds.add(card.dataset.id);
        playAlertSound();
      }
    } else {
      countdownEl.textContent = formatRemaining(remaining);
      if (statusEl) statusEl.textContent = "探索中";
      card.classList.remove("is-arrived");
      if (progressFill) {
        const pct = totalMs > 0 ? Math.min(100, Math.max(0, ((now - departedAt) / totalMs) * 100)) : 0;
        progressFill.style.width = `${pct}%`;
      }
    }
  });
}

setInterval(tickCountdowns, 1000);

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
  const addBtn = e.target.closest('[data-action="add-category"]');
  if (addBtn) {
    categoryForm.reset();
    categoryDialog.showModal();
    return;
  }

  const removeBtn = e.target.closest("[data-remove-id]");
  if (removeBtn) {
    e.stopPropagation();
    if (!confirm("確定要刪除這個分類嗎？底下的潛水艇資料也會一併刪除")) return;
    const removeId = removeBtn.dataset.removeId;
    saveCategories(loadCategories().filter((c) => c.id !== removeId));
    saveSubmarines(loadSubmarines().filter((s) => s.categoryId !== removeId));
    if (selectedCategoryId === removeId) selectedCategoryId = ALL_CATEGORIES;
    renderCategoryPills();
    return;
  }

  const pill = e.target.closest(".category-pill");
  if (pill && pill.dataset.id) {
    selectedCategoryId = pill.dataset.id;
    renderCategoryPills();
  }
});

openAddSubmarineBtn.addEventListener("click", () => {
  if (selectedCategoryId === ALL_CATEGORIES) return;
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
  const departedAt = Date.now();
  submarines.push({
    id: crypto.randomUUID(),
    categoryId: selectedCategoryId,
    departedAt,
    returnAt: departedAt + ms,
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
