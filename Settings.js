// ── settings.js : 알림 설정 ──────────────────────────────────────────
//
// ★ EmailJS 설정 방법 (무료, 서버 불필요)
//   1. https://www.emailjs.com 회원가입
//   2. Email Services → Gmail/Outlook 등 연결 → Service ID 복사
//   3. Email Templates → 새 템플릿 생성
//      - 받는 사람: {{to_email}}
//      - 제목 예) [Q-Log] {{date_str}} 일기를 작성할 시간이에요 ✏️
//      - 본문 예) 안녕하세요 {{to_name}}님, {{message}}
//   4. Account → Public Key 복사
//   5. 아래 세 상수를 교체하세요

const EMAILJS_SERVICE_ID  = 'service_tdopgvz';
const EMAILJS_TEMPLATE_ID = 'template_sijsaan';
const EMAILJS_PUBLIC_KEY  = 'F-lMwkXBfxRTPe_fB';

const STORAGE_KEY   = 'qlog_notification_settings';
const LAST_SENT_KEY = 'qlog_notif_last_sent';
const TICK_MS       = 30_000;

// ── 기본값 ───────────────────────────────────────────────────────────
const defaultSettings = {
  enabled:       false,
  days:          [],
  hour:          21,
  minute:        0,
  email:         '',   // 알림 수신 주소 (계정 이메일과 별도로 편집 가능)
};

// ── 스토리지 ─────────────────────────────────────────────────────────
function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...defaultSettings, ...JSON.parse(raw) } : { ...defaultSettings };
  } catch { return { ...defaultSettings }; }
}
function saveSettings(s) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

// ── 토스트 ───────────────────────────────────────────────────────────
function showToast(msg, isError = false) {
  document.querySelector('.settings-toast')?.remove();
  const t = document.createElement('div');
  t.className = 'settings-toast' + (isError ? ' error' : '');
  t.textContent = msg;
  document.body.appendChild(t);
  requestAnimationFrame(() => t.classList.add('visible'));
  setTimeout(() => { t.classList.remove('visible'); setTimeout(() => t.remove(), 400); }, 2800);
}

// ── EmailJS ───────────────────────────────────────────────────────────
function loadEmailJS() {
  return new Promise((resolve, reject) => {
    if (window.emailjs) { resolve(); return; }
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js';
    s.onload  = () => { emailjs.init(EMAILJS_PUBLIC_KEY); resolve(); };
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

async function sendEmailNotification(toEmail) {
  if (EMAILJS_PUBLIC_KEY === 'YOUR_PUBLIC_KEY') {
    showToast('⚠️ EmailJS 설정이 필요합니다. settings.js 상단의 키를 교체해주세요.', true);
    return false;
  }
  try {
    await loadEmailJS();
    const now     = new Date();
    const dateStr = now.toLocaleDateString('ko-KR', {
      year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
    });
    await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
      to_email: toEmail,
      to_name:  toEmail.split('@')[0],
      date_str: dateStr,
      app_name: 'Q-Log',
      message:  '오늘 하루는 어땠나요? Q-Log에 오늘의 이야기를 기록해보세요 ✏️',
    });
    return true;
  } catch (err) {
    console.error('[Q-Log] EmailJS 발송 실패:', err);
    return false;
  }
}

// ── 스케줄러 ─────────────────────────────────────────────────────────
function startScheduler() {
  clearInterval(window._qlogScheduler);
  window._qlogScheduler = setInterval(checkAndSend, TICK_MS);
  checkAndSend();
}
async function checkAndSend() {
  const s = loadSettings();
  if (!s.enabled || !s.email || s.days.length === 0) return;
  const now      = new Date();
  const todayKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
  if (localStorage.getItem(LAST_SENT_KEY) === todayKey) return;
  if (!s.days.includes(now.getDay()))  return;
  if (now.getHours()   !== s.hour)     return;
  if (now.getMinutes() !== s.minute)   return;
  localStorage.setItem(LAST_SENT_KEY, todayKey);
  const ok = await sendEmailNotification(s.email);
  if (ok) showToast(`📧 ${s.email} 로 알림 메일을 발송했습니다.`);
  else    localStorage.removeItem(LAST_SENT_KEY);
}

// ── 분 UI ────────────────────────────────────────────────────────────
function setupMinuteInput(settings, settingsBody) {
  const wrap     = document.getElementById('minuteSelectWrap');
  const selectEl = document.getElementById('minuteSelect');
  const PRESETS  = [0,1,2,3,4,5,10,15,20,25,30,35,40,45,50,55];

  PRESETS.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m;
    opt.textContent = String(m).padStart(2,'0') + '분';
    if (m === settings.minute) opt.selected = true;
    selectEl.appendChild(opt);
  });

  selectEl.addEventListener('change', () => {
    if (settingsBody.classList.contains('disabled')) return;
    settings.minute = parseInt(selectEl.value, 10);
    saveSettings(settings);
    updateTimePreview();
  });

  function enterDirectMinute() {
    if (settingsBody.classList.contains('disabled')) return;
    if (wrap.querySelector('.minute-direct-input')) return;

    selectEl.style.display = 'none';
    const inp = document.createElement('input');
    inp.type = 'text'; inp.inputMode = 'numeric'; inp.pattern = '[0-9]*';
    inp.maxLength = 2; inp.placeholder = '분';
    inp.value = String(settings.minute).padStart(2,'0');
    inp.className = 'time-select minute-direct-input';

    const hint = document.createElement('div');
    hint.className = 'minute-direct-hint';
    hint.textContent = '0 ~ 59 직접 입력 · Enter로 확인';

    wrap.appendChild(inp); wrap.appendChild(hint);
    inp.focus(); inp.select();

    inp.addEventListener('input', () => { inp.value = inp.value.replace(/[^0-9]/g,'').slice(0,2); });

    function confirm() {
      let val = parseInt(inp.value, 10);
      if (isNaN(val) || val < 0) val = 0;
      if (val > 59) val = 59;
      settings.minute = val; saveSettings(settings);
      let found = false;
      for (const o of selectEl.options) { if (parseInt(o.value,10) === val) { o.selected = true; found = true; break; } }
      if (!found) {
        const o = document.createElement('option');
        o.value = val; o.textContent = String(val).padStart(2,'0') + '분'; o.selected = true;
        selectEl.appendChild(o);
        const sorted = [...selectEl.options].sort((a,b)=>parseInt(a.value)-parseInt(b.value));
        selectEl.innerHTML = ''; sorted.forEach(x => selectEl.appendChild(x));
        selectEl.value = String(val);
      }
      inp.remove(); hint.remove(); selectEl.style.display = '';
      updateTimePreview();
    }
    inp.addEventListener('keydown', e => {
      if (e.key === 'Enter')  { e.preventDefault(); confirm(); }
      if (e.key === 'Escape') { inp.remove(); hint.remove(); selectEl.style.display = ''; }
    });
    inp.addEventListener('blur', () => setTimeout(confirm, 100));
  }

  selectEl.addEventListener('dblclick', e => { e.preventDefault(); enterDirectMinute(); });
  let lastTap = 0;
  selectEl.addEventListener('touchend', e => {
    const now = Date.now();
    if (now - lastTap < 300) { e.preventDefault(); enterDirectMinute(); }
    lastTap = now;
  });
  document.getElementById('minuteHintBtn')?.addEventListener('click', enterDirectMinute);
}

// ── 시간 미리보기 ─────────────────────────────────────────────────────
function updateTimePreview() {
  const h    = parseInt(document.getElementById('hourSelect')?.value ?? 21, 10);
  const m    = parseInt(document.getElementById('minuteSelect')?.value ?? 0, 10);
  const ampm = h < 12 ? '오전' : '오후';
  const h12  = h % 12 === 0 ? 12 : h % 12;
  const prev = document.getElementById('timePreview');
  if (prev) prev.textContent = `${ampm} ${h12}:${String(m).padStart(2,'0')}`;
}

// ── 이메일 수신 주소 편집 UI ─────────────────────────────────────────
// 더블클릭/더블탭으로 직접 편집 가능. 계정 이메일(qlog_user_email)은 건드리지 않음.
function setupEmailEdit(settings) {
  const emailWrap    = document.getElementById('emailEditWrap');
  const emailDisplay = document.getElementById('notifEmailDisplay');
  const loginEmail   = localStorage.getItem('qlog_user_email') || '';

  // 페이지 진입 시 항상 현재 계정 이메일로 표시 (알림 수신 주소가 없는 경우)
  if (!settings.email && loginEmail) {
    settings.email = loginEmail;
    saveSettings(settings);
  }
  refreshEmailDisplay(settings.email, loginEmail);

  function refreshEmailDisplay(addr, loginAddr) {
    emailDisplay.textContent = addr || '(로그인 후 자동 설정)';
    // 계정 이메일과 다른 경우 배지 표시
    const badge = document.getElementById('emailDiffBadge');
    if (badge) {
      badge.style.display = (addr && loginAddr && addr !== loginAddr) ? 'inline-flex' : 'none';
    }
  }

  function enterEmailEdit() {
    if (emailWrap.querySelector('.email-direct-input')) return;

    emailDisplay.style.display = 'none';
    const badge = document.getElementById('emailDiffBadge');
    if (badge) badge.style.display = 'none';

    const inp = document.createElement('input');
    inp.type        = 'email';
    inp.value       = settings.email || loginEmail;
    inp.className   = 'email-direct-input';
    inp.placeholder = '알림 받을 이메일 주소';
    inp.spellcheck  = false;

    // 되돌리기 버튼
    const resetBtn = document.createElement('button');
    resetBtn.className   = 'email-reset-btn';
    resetBtn.type        = 'button';
    resetBtn.title       = '계정 이메일로 되돌리기';
    resetBtn.textContent = '↩ 계정 이메일로';

    const hint = document.createElement('div');
    hint.className   = 'email-edit-hint';
    hint.textContent = 'Enter로 저장 · Esc로 취소';

    emailWrap.appendChild(inp);
    emailWrap.appendChild(resetBtn);
    emailWrap.appendChild(hint);
    inp.focus();

    resetBtn.addEventListener('mousedown', e => {
      e.preventDefault(); // blur 방지
      inp.value = loginEmail;
    });

    function confirmEmail() {
      const val = inp.value.trim();
      // 간단한 이메일 형식 체크
      if (val && !val.includes('@')) {
        showToast('⚠️ 올바른 이메일 주소를 입력해주세요.', true);
        return;
      }
      settings.email = val || loginEmail;
      saveSettings(settings);
      inp.remove(); resetBtn.remove(); hint.remove();
      emailDisplay.style.display = '';
      refreshEmailDisplay(settings.email, loginEmail);
      showToast('✅ 알림 수신 주소가 저장되었습니다.');

      // 테스트 버튼 이메일 업데이트
      const testBtn = document.getElementById('testEmailBtn');
      if (testBtn) testBtn.dataset.email = settings.email;
    }

    inp.addEventListener('keydown', e => {
      if (e.key === 'Enter')  { e.preventDefault(); confirmEmail(); }
      if (e.key === 'Escape') {
        inp.remove(); resetBtn.remove(); hint.remove();
        emailDisplay.style.display = '';
        refreshEmailDisplay(settings.email, loginEmail);
      }
    });
    inp.addEventListener('blur', e => {
      // 되돌리기 버튼 클릭은 mousedown에서 처리하므로 relatedTarget 확인
      if (e.relatedTarget === resetBtn) return;
      setTimeout(confirmEmail, 120);
    });
  }

  // 더블클릭
  emailWrap.addEventListener('dblclick', e => { e.preventDefault(); enterEmailEdit(); });
  // 더블탭
  let lastTap = 0;
  emailWrap.addEventListener('touchend', e => {
    const now = Date.now();
    if (now - lastTap < 300) { e.preventDefault(); enterEmailEdit(); }
    lastTap = now;
  });
  // 편집 버튼
  document.getElementById('emailEditBtn')?.addEventListener('click', enterEmailEdit);
}

// ── DOMContentLoaded ─────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const settings     = loadSettings();
  const settingsBody = document.getElementById('settingsBody');

  // ── 뒤로가기 ────────────────────────────────────────────────────
  document.getElementById('backBtn').addEventListener('click', () => history.back());

  // ── 마스터 토글 ─────────────────────────────────────────────────
  const masterToggle = document.getElementById('notifToggle');
  function applyMaster(enabled) {
    masterToggle.checked = enabled;
    settingsBody.classList.toggle('disabled', !enabled);
    document.getElementById('toggleStatusText').textContent = enabled ? '켜짐' : '꺼짐';
  }
  applyMaster(settings.enabled);
  masterToggle.addEventListener('change', () => {
    settings.enabled = masterToggle.checked;
    applyMaster(settings.enabled);
    saveSettings(settings);
    showToast(settings.enabled ? '알림이 활성화되었습니다.' : '알림이 비활성화되었습니다.');
    if (settings.enabled) startScheduler();
  });

  // ── 요일 ────────────────────────────────────────────────────────
  document.querySelectorAll('.day-btn').forEach(btn => {
    const idx = parseInt(btn.dataset.day, 10);
    if (settings.days.includes(idx)) btn.classList.add('active');
    btn.addEventListener('click', () => {
      if (settingsBody.classList.contains('disabled')) return;
      btn.classList.toggle('active');
      settings.days = btn.classList.contains('active')
        ? [...new Set([...settings.days, idx])]
        : settings.days.filter(d => d !== idx);
      saveSettings(settings);
    });
  });

  // ── 시 ──────────────────────────────────────────────────────────
  const hourSelect = document.getElementById('hourSelect');
  for (let h = 0; h < 24; h++) {
    const opt = document.createElement('option');
    opt.value = h; opt.textContent = String(h).padStart(2,'0') + '시';
    if (h === settings.hour) opt.selected = true;
    hourSelect.appendChild(opt);
  }
  hourSelect.addEventListener('change', () => {
    if (settingsBody.classList.contains('disabled')) return;
    settings.hour = parseInt(hourSelect.value, 10);
    saveSettings(settings); updateTimePreview();
  });

  // ── 분 ──────────────────────────────────────────────────────────
  setupMinuteInput(settings, settingsBody);
  updateTimePreview();

  // ── 이메일 수신 주소 편집 ───────────────────────────────────────
  setupEmailEdit(settings);

  // ── 테스트 발송 ─────────────────────────────────────────────────
  document.getElementById('testEmailBtn')?.addEventListener('click', async () => {
    const s     = loadSettings();
    const email = s.email || localStorage.getItem('qlog_user_email');
    if (!email) { showToast('⚠️ 알림 수신 주소가 없습니다.', true); return; }
    const btn = document.getElementById('testEmailBtn');
    btn.disabled = true; btn.textContent = '발송 중…';
    const ok = await sendEmailNotification(email);
    btn.disabled = false; btn.textContent = '테스트 발송';
    showToast(ok ? `📧 ${email} 로 테스트 메일을 발송했습니다.` : '❌ 발송 실패. EmailJS 설정을 확인해주세요.', !ok);
  });

  // ── 저장 ────────────────────────────────────────────────────────
  document.getElementById('saveBtn').addEventListener('click', () => {
    if (settings.enabled && settings.days.length === 0) {
      showToast('⚠️ 알림 받을 요일을 하나 이상 선택해주세요.', true); return;
    }
    saveSettings(settings);
    if (settings.enabled) startScheduler();
    showToast('✅ 알림 설정이 저장되었습니다.');
    setTimeout(() => history.back(), 1200);
  });

  if (settings.enabled) startScheduler();
});
