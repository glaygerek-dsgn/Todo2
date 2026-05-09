const WEATHER_KEY = '56d53893d9c16f0961577d4eb9b8e80c';
const SUPABASE_URL = 'https://ilwldquqwrseulgdtily.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlsd2xkcXVxd3JzZXVsZ2R0aWx5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyNDYxNDAsImV4cCI6MjA5MzgyMjE0MH0.HCQHdKFtQyAw__aUKTrpWtTENA-Qu0CNuYLHUC4hsNc';

let session = JSON.parse(localStorage.getItem('sb_session') || 'null');

// ── Altyapı Kadınlar maç verisi (9-15 Mayıs 2026) ────────────────────────────

const ALTYAPI_KADIN = [
  { ev: 'ORDU 1921 ORDUSPOR',            dep: 'GAZİANTEP ANTEPİASPOR',           tarih: '10.05.2026', saat: '10:00', salon: 'Orduzu Spor Salonu' },
  { ev: '1071 ANADOLU SK',               dep: 'VEFA SK',                          tarih: '10.05.2026', saat: '10:00', salon: 'Ahmet Aytar' },
  { ev: 'GÖLCÜK BLD. SPOR',              dep: 'KARABÜK GSİM',                     tarih: '10.05.2026', saat: '11:00', salon: '18 Temmuz' },
  { ev: 'İZMİR İZEGE SPOR',              dep: 'ANKARA TVF SPOR LİSESİ',           tarih: '10.05.2026', saat: '11:00', salon: 'Şehit Turgut Solak' },
  { ev: '07 GAZİ SPOR',                  dep: 'KONYA BÜYÜKŞEHİR BLD. SPOR',      tarih: '10.05.2026', saat: '11:00', salon: 'Kalfa' },
  { ev: 'İZMİR GÖZTEPE S.K.',            dep: 'İSTANBUL GALATASARAY S.K.',        tarih: '10.05.2026', saat: '11:00', salon: 'Yeni Salon' },
  { ev: 'OSMANCIK BLD. SPOR KULÜBÜ',     dep: 'KUZEYBORU MAXİPİPE',              tarih: '10.05.2026', saat: '11:00', salon: 'Hüseyin Akbaş' },
  { ev: 'ELAZIĞ GENÇLİKSPOR',           dep: 'KAYSERİ MELİKGAZİ BLD.SPOR',      tarih: '10.05.2026', saat: '12:00', salon: 'Orduzu Spor Salonu' },
  { ev: 'ESKİŞEHİR ŞEHİR KOLEJİ',       dep: 'SAKARYA SERDİVAN BLD. SPOR',       tarih: '10.05.2026', saat: '12:00', salon: 'Şampiyon Hasan Gemici' },
  { ev: 'GENÇLİK SK',                    dep: 'ANTEPİA SK',                       tarih: '10.05.2026', saat: '12:00', salon: 'Ahmet Aytar' },
];

const MONTHS_TR = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
const DAYS_TR   = ['Pazar','Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi'];

function formatDateTR(tarih) {
  const [d, m, y] = tarih.split('.');
  const date = new Date(`${y}-${m}-${d}`);
  return `${parseInt(d)} ${MONTHS_TR[parseInt(m)-1]} ${y} · ${DAYS_TR[date.getDay()]}`;
}

function renderSchedule() {
  const list = document.getElementById('scheduleList');
  if (!list) return;

  const now = new Date(); now.setHours(0, 0, 0, 0);
  const weekEnd = new Date(now); weekEnd.setDate(now.getDate() + 7);

  const byDate = {};
  ALTYAPI_KADIN.forEach(m => {
    const [d, mo, y] = m.tarih.split('.');
    const matchDate = new Date(`${y}-${mo}-${d}`);
    if (matchDate >= now && matchDate < weekEnd) {
      (byDate[m.tarih] = byDate[m.tarih] || []).push(m);
    }
  });

  const sortedDates = Object.keys(byDate).sort((a, b) => {
    const toD = s => { const [d,m,y] = s.split('.'); return new Date(`${y}-${m}-${d}`); };
    return toD(a) - toD(b);
  });

  if (!sortedDates.length) {
    list.innerHTML = '<div class="schedule-empty">Bu hafta maç yok</div>';
    return;
  }

  list.innerHTML = sortedDates.map(tarih => `
    <div class="schedule-day-header">${formatDateTR(tarih)}</div>
    ${byDate[tarih].map(m => `
      <div class="schedule-match">
        <div class="schedule-match-top">
          <span class="schedule-time">${m.saat}</span>
          <div class="schedule-teams">
            <span class="schedule-team">${escHtml(m.ev)}</span>
            <span class="schedule-vs">— vs —</span>
            <span class="schedule-team">${escHtml(m.dep)}</span>
          </div>
        </div>
        <span class="schedule-salon">📍 ${escHtml(m.salon)}</span>
      </div>
    `).join('')}
  `).join('');
}

// ── Hava durumu ───────────────────────────────────────────────────────────────

const WEATHER_ICONS = {
  '01': '☀️', '02': '⛅', '03': '☁️', '04': '☁️',
  '09': '🌧️', '10': '🌦️', '11': '⛈️', '13': '❄️', '50': '🌫️'
};

async function loadWeather() {
  const url = `https://api.openweathermap.org/data/2.5/weather?q=Ankara&appid=${WEATHER_KEY}&units=metric&lang=tr`;
  applyWeather(await (await fetch(url)).json());
}

function applyWeather(data) {
  if (!data || data.cod !== 200) {
    document.getElementById('weatherWidget').style.display = 'none';
    return;
  }
  const icon = data.weather[0].icon.slice(0, 2);
  document.getElementById('weatherIcon').textContent  = WEATHER_ICONS[icon] || '🌡️';
  document.getElementById('weatherTemp').textContent  = Math.round(data.main.temp) + '°C';
  document.getElementById('weatherDesc').textContent  = data.weather[0].description;
  document.getElementById('weatherCity').textContent  = data.name;
}
let filter = 'all';

// ── API helpers ──────────────────────────────────────────────────────────────

function authHeaders(extra = {}) {
  return {
    'Content-Type': 'application/json',
    'apikey': ANON_KEY,
    'Authorization': `Bearer ${session ? session.access_token : ANON_KEY}`,
    ...extra
  };
}

async function api(path, opts = {}) {
  const res = await fetch(SUPABASE_URL + path, {
    ...opts,
    headers: { ...authHeaders(), ...(opts.headers || {}) }
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || err.error_description || res.statusText);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

// ── Auth ─────────────────────────────────────────────────────────────────────

async function signUp(email, password) {
  const data = await api('/auth/v1/signup', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });
  return data;
}

async function signIn(email, password) {
  const data = await api('/auth/v1/token?grant_type=password', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });
  session = data;
  localStorage.setItem('sb_session', JSON.stringify(session));
  return data;
}

async function signOut() {
  await api('/auth/v1/logout', { method: 'POST' }).catch(() => {});
  session = null;
  localStorage.removeItem('sb_session');
}

async function sendPasswordReset(email) {
  return api('/auth/v1/recover', {
    method: 'POST',
    body: JSON.stringify({ email })
  });
}

async function updatePassword(newPassword, accessToken) {
  const res = await fetch(SUPABASE_URL + '/auth/v1/user', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'apikey': ANON_KEY,
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify({ password: newPassword })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || res.statusText);
  }
  return res.json();
}

// ── Todos REST ────────────────────────────────────────────────────────────────

async function fetchTodos() {
  return api('/rest/v1/todos?select=*&order=created_at.asc', {
    headers: { 'Prefer': 'return=representation' }
  });
}

async function addTodo(text) {
  return api('/rest/v1/todos', {
    method: 'POST',
    headers: { 'Prefer': 'return=representation' },
    body: JSON.stringify({ text, done: false, user_id: session.user.id })
  });
}

async function updateTodo(id, patch) {
  return api(`/rest/v1/todos?id=eq.${id}`, {
    method: 'PATCH',
    headers: { 'Prefer': 'return=representation' },
    body: JSON.stringify(patch)
  });
}

async function deleteTodo(id) {
  return api(`/rest/v1/todos?id=eq.${id}`, { method: 'DELETE' });
}

async function deleteDoneTodos() {
  return api('/rest/v1/todos?done=eq.true', { method: 'DELETE' });
}

// ── UI helpers ────────────────────────────────────────────────────────────────

function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function showError(msg) {
  const el = document.getElementById('authError');
  el.textContent = msg;
  el.style.display = 'block';
}

function hideError() {
  const el = document.getElementById('authError');
  el.style.display = 'none';
}

function setLoading(btn, loading) {
  btn.disabled = loading;
  btn.dataset.orig = btn.dataset.orig || btn.textContent;
  btn.textContent = loading ? '...' : btn.dataset.orig;
}

// ── Auth screen ───────────────────────────────────────────────────────────────

function hideAllScreens() {
  ['authScreen','registerScreen','resetScreen','newPasswordScreen','appScreen']
    .forEach(id => document.getElementById(id).style.display = 'none');
}

function showAuth() {
  hideAllScreens();
  document.getElementById('authScreen').style.display = 'block';
}

function showRegister() {
  hideAllScreens();
  document.getElementById('registerScreen').style.display = 'block';
}

function showReset() {
  hideAllScreens();
  document.getElementById('resetScreen').style.display = 'block';
}

function showNewPassword() {
  hideAllScreens();
  document.getElementById('newPasswordScreen').style.display = 'block';
}

function showApp() {
  hideAllScreens();
  document.getElementById('appScreen').style.display = 'block';
  document.getElementById('userEmail').textContent = session.user.email;
  loadTodos();
}

// ── Todo render ───────────────────────────────────────────────────────────────

function renderTodos(todos) {
  const list = document.getElementById('todoList');
  list.innerHTML = '';

  const visible = todos.filter(t =>
    filter === 'all'    ? true :
    filter === 'active' ? !t.done :
    t.done
  );

  if (visible.length === 0) {
    list.innerHTML = '<li class="empty">Görev yok</li>';
  } else {
    visible.forEach(todo => {
      const li = document.createElement('li');
      li.className = 'todo-item' + (todo.done ? ' done' : '');
      li.innerHTML = `
        <input type="checkbox" ${todo.done ? 'checked' : ''} data-id="${todo.id}" />
        <span class="label">${escHtml(todo.text)}</span>
        <button class="del-btn" data-id="${todo.id}" title="Sil">&#x2715;</button>
      `;
      list.appendChild(li);
    });
  }

  const activeCount = todos.filter(t => !t.done).length;
  document.getElementById('remaining').textContent = `${activeCount} görev kaldı`;
}

let todosCache = [];

async function loadTodos() {
  try {
    todosCache = await fetchTodos() || [];
    renderTodos(todosCache);
  } catch (e) {
    console.error(e);
  }
}

// ── Event wiring ──────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  loadWeather();
  renderSchedule();

  const loginTab    = document.getElementById('loginTab');
  const registerTab = document.getElementById('registerTab');

  async function handleAuth(mode) {
    const email    = document.getElementById('emailInput').value.trim();
    const password = document.getElementById('passwordInput').value;
    if (!email || !password) { showError('E-posta ve şifre gerekli.'); return; }
    setLoading(loginTab, true);
    hideError();
    try {
      await signIn(email, password);
      showApp();
    } catch (e) {
      showError(e.message);
    }
    setLoading(loginTab, false);
  }

  loginTab.addEventListener('click', () => handleAuth('login'));
  registerTab.addEventListener('click', () => { hideError(); showRegister(); });

  // Kayıt ol ekranı
  document.getElementById('backToLoginFromReg').addEventListener('click', () => {
    document.getElementById('regError').style.display = 'none';
    showAuth();
  });

  document.getElementById('regSubmitBtn').addEventListener('click', async () => {
    const email    = document.getElementById('regEmail').value.trim();
    const pass1    = document.getElementById('regPassword').value;
    const pass2    = document.getElementById('regPasswordConfirm').value;
    const errEl    = document.getElementById('regError');
    errEl.style.display = 'none';

    if (!email || !pass1) { errEl.textContent = 'E-posta ve şifre gerekli.'; errEl.style.display = 'block'; return; }
    if (pass1.length < 6)  { errEl.textContent = 'Şifre en az 6 karakter olmalıdır.'; errEl.style.display = 'block'; return; }
    if (pass1 !== pass2)   { errEl.textContent = 'Şifreler eşleşmiyor.'; errEl.style.display = 'block'; return; }

    const btn = document.getElementById('regSubmitBtn');
    setLoading(btn, true);
    try {
      const res = await signUp(email, pass1);
      if (!res.access_token) {
        errEl.style.color = '#40e0d0';
        errEl.textContent = 'Kayıt başarılı! E-postanızı doğrulayın, ardından giriş yapın.';
        errEl.style.display = 'block';
        setLoading(btn, false);
        return;
      }
      session = res;
      localStorage.setItem('sb_session', JSON.stringify(session));
      showApp();
    } catch (e) {
      errEl.style.color = '#ff9dce';
      errEl.textContent = e.message;
      errEl.style.display = 'block';
    }
    setLoading(btn, false);
  });

  // Enter tuşu → giriş yap
  ['emailInput','passwordInput'].forEach(id => {
    document.getElementById(id).addEventListener('keydown', e => {
      if (e.key === 'Enter') handleAuth('login');
    });
  });

  // Sign out
  document.getElementById('signOutBtn').addEventListener('click', async () => {
    await signOut();
    showAuth();
  });

  // Add todo
  const todoInput = document.getElementById('todoInput');
  const addBtn    = document.getElementById('addBtn');

  async function handleAdd() {
    const text = todoInput.value.trim();
    if (!text) return;
    setLoading(addBtn, true);
    try {
      const [created] = await addTodo(text);
      todoInput.value = '';
      todosCache.push(created);
      renderTodos(todosCache);
    } catch (e) { console.error(e); }
    setLoading(addBtn, false);
  }

  addBtn.addEventListener('click', handleAdd);
  todoInput.addEventListener('keydown', e => { if (e.key === 'Enter') handleAdd(); });

  // Checkbox & delete
  document.getElementById('todoList').addEventListener('change', async e => {
    if (e.target.type !== 'checkbox') return;
    const id = e.target.dataset.id;
    const done = e.target.checked;
    const todo = todosCache.find(t => t.id === id);
    if (todo) { todo.done = done; renderTodos(todosCache); }
    await updateTodo(id, { done }).catch(console.error);
  });

  document.getElementById('todoList').addEventListener('click', async e => {
    const btn = e.target.closest('.del-btn');
    if (!btn) return;
    const id = btn.dataset.id;
    todosCache = todosCache.filter(t => t.id !== id);
    renderTodos(todosCache);
    await deleteTodo(id).catch(console.error);
  });

  // Filters
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      filter = btn.dataset.filter;
      renderTodos(todosCache);
    });
  });

  // Clear done
  document.getElementById('clearDone').addEventListener('click', async () => {
    todosCache = todosCache.filter(t => !t.done);
    renderTodos(todosCache);
    await deleteDoneTodos().catch(console.error);
  });

  // Şifremi unuttum
  document.getElementById('forgotBtn').addEventListener('click', () => {
    hideError();
    showReset();
  });

  document.getElementById('backToLogin').addEventListener('click', () => {
    document.getElementById('resetError').style.display = 'none';
    showAuth();
  });

  document.getElementById('resetSendBtn').addEventListener('click', async () => {
    const email = document.getElementById('resetEmail').value.trim();
    const errEl = document.getElementById('resetError');
    if (!email) { errEl.textContent = 'E-posta gerekli.'; errEl.style.display = 'block'; return; }
    const btn = document.getElementById('resetSendBtn');
    setLoading(btn, true);
    errEl.style.display = 'none';
    try {
      await sendPasswordReset(email);
      errEl.style.display = 'block';
      errEl.style.color = '#40e0d0';
      errEl.textContent = 'Bağlantı gönderildi! E-postanızı kontrol edin.';
    } catch (e) {
      errEl.style.color = '#ff9dce';
      errEl.textContent = e.message;
      errEl.style.display = 'block';
    }
    setLoading(btn, false);
  });

  // Yeni şifre kaydet (e-posta linkinden gelince)
  document.getElementById('newPasswordSaveBtn').addEventListener('click', async () => {
    const newPass = document.getElementById('newPasswordInput').value;
    const errEl   = document.getElementById('newPasswordError');
    if (newPass.length < 6) {
      errEl.textContent = 'Şifre en az 6 karakter olmalıdır.';
      errEl.style.display = 'block';
      return;
    }
    const btn = document.getElementById('newPasswordSaveBtn');
    setLoading(btn, true);
    errEl.style.display = 'none';
    const token = new URLSearchParams(window.location.hash.slice(1)).get('access_token');
    try {
      await updatePassword(newPass, token);
      errEl.style.color = '#40e0d0';
      errEl.textContent = 'Şifreniz güncellendi! Giriş yapabilirsiniz.';
      errEl.style.display = 'block';
      window.location.hash = '';
      setTimeout(() => showAuth(), 2000);
    } catch (e) {
      errEl.style.color = '#ff9dce';
      errEl.textContent = e.message;
      errEl.style.display = 'block';
    }
    setLoading(btn, false);
  });

  // Init — e-posta reset linkinden gelince hash'i kontrol et
  const hash = new URLSearchParams(window.location.hash.slice(1));
  if (hash.get('type') === 'recovery' && hash.get('access_token')) {
    showNewPassword();
  } else if (session) {
    showApp();
  } else {
    showAuth();
  }
});
