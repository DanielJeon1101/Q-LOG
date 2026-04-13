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

const EMAILJS_SERVICE_ID  = 'YOUR_SERVICE_ID';
const EMAILJS_TEMPLATE_ID = 'YOUR_TEMPLATE_ID';
const EMAILJS_PUBLIC_KEY  = 'YOUR_PUBLIC_KEY';

const STORAGE_KEY      = 'qlog_notification_settings';
const LAST_SENT_KEY    = 'qlog_notif_last_sent';
const TICK_MS          = 30_000; // 30초마다 스케줄 체크

// ── 기본값 ───────────────────────────────────────────────────────────
const defaultSettings = {
  enabled:  false,
  days:     [],
  hour:     21,
  minute:   0,
  email:    '',
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

// ── EmailJS 로드 & 발송 ───────────────────────────────────────────────
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

  if (!s.days.includes(now.getDay()))   return;
  if (now.getHours()   !== s.hour)      return;
  if (now.getMinutes() !== s.minute)    return;

  localStorage.setItem(LAST_SENT_KEY, todayKey); // 중복 방지 선점
  const ok = await sendEmailNotification(s.email);
  if (ok) {
    showToast(`📧 ${s.email} 로 알림 메일을 발송했습니다.`);
  } else {
    localStorage.removeItem(LAST_SENT_KEY);       // 실패 시 재시도 허용
  }
}

// ── 분 UI 세팅 ───────────────────────────────────────────────────────
function setupMinuteInput(settings, settingsBody) {
  const wrap     = document.getElementById('minuteSelectWrap');
  const selectEl = document.getElementById('minuteSelect');
  const PRESETS  = [0,1,2,3,4,5,10,15,20,25,30,35,40,45,50,55];

  // 분 옵션 생성
  PRESETS.forEach(m => {
    const opt       = document.createElement('option');
    opt.value       = m;
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

  // ── 직접 입력 모드 진입 ───────────────────────────────────────────
  function enterDirectInput() {
    if (settingsBody.classList.contains('disabled')) return;
    if (wrap.querySelector('.minute-direct-input')) return; // 이미 입력 중

    selectEl.style.display = 'none';

    const inp       = document.createElement('input');
    inp.type        = 'text';
    inp.inputMode   = 'numeric';
    inp.pattern     = '[0-9]*';
    inp.maxLength   = 2;
    inp.placeholder = '분';
    inp.value       = String(settings.minute).padStart(2,'0');
    inp.className   = 'time-select minute-direct-input';

    const hint       = document.createElement('div');
    hint.className   = 'minute-direct-hint';
    hint.textContent = '0 ~ 59 직접 입력 · Enter로 확인';

    wrap.appendChild(inp);
    wrap.appendChild(hint);
    inp.focus();
    inp.select();

    // 숫자만 허용
    inp.addEventListener('input', () => {
      inp.value = inp.value.replace(/[^0-9]/g,'').slice(0,2);
    });

    function confirm() {
      let val = parseInt(inp.value, 10);
      if (isNaN(val) || val < 0) val = 0;
      if (val > 59)              val = 59;
      settings.minute = val;
      saveSettings(settings);

      // select 에 해당 값 반영 (없으면 추가 후 정렬)
      let found = false;
      for (const o of selectEl.options) {
        if (parseInt(o.value,10) === val) { o.selected = true; found = true; break; }
      }
      if (!found) {
        const newOpt       = document.createElement('option');
        newOpt.value       = val;
        newOpt.textContent = String(val).padStart(2,'0') + '분';
        newOpt.selected    = true;
        selectEl.appendChild(newOpt);
        const sorted = [...selectEl.options].sort((a,b) => parseInt(a.value)-parseInt(b.value));
        selectEl.innerHTML = '';
        sorted.forEach(o => selectEl.appendChild(o));
        selectEl.value = String(val);
      }

      inp.remove();
      hint.remove();
      selectEl.style.display = '';
      updateTimePreview();
    }

    inp.addEventListener('keydown', e => {
      if (e.key === 'Enter')  { e.preventDefault(); confirm(); }
      if (e.key === 'Escape') { inp.remove(); hint.remove(); selectEl.style.display = ''; }
    });
    inp.addEventListener('blur', () => setTimeout(confirm, 100));
  }

  // 마우스 더블클릭
  selectEl.addEventListener('dblclick', e => { e.preventDefault(); enterDirectInput(); });

  // 터치 더블탭 (300ms 이내 2회)
  let lastTap = 0;
  selectEl.addEventListener('touchend', e => {
    const now = Date.now();
    if (now - lastTap < 300) { e.preventDefault(); enterDirectInput(); }
    lastTap = now;
  });

  // 힌트 버튼 클릭
  document.getElementById('minuteHintBtn')?.addEventListener('click', () => enterDirectInput());
}

// ── 시간 미리보기 ─────────────────────────────────────────────────────
function updateTimePreview() {
  const h   = parseInt(document.getElementById('hourSelect')?.value   ?? 21, 10);
  const m   = parseInt(document.getElementById('minuteSelect')?.value ?? 0,  10);
  const ampm = h < 12 ? '오전' : '오후';
  const h12  = h % 12 === 0 ? 12 : h % 12;
  const prev = document.getElementById('timePreview');
  if (prev) prev.textContent = `${ampm} ${h12}:${String(m).padStart(2,'0')}`;
}

// ── DOMContentLoaded ─────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const settings     = loadSettings();
  const settingsBody = document.getElementById('settingsBody');

  // 로그인 이메일 자동 주입
  const cachedEmail = localStorage.getItem('qlog_user_email') || '';
  if (cachedEmail && !settings.email) { settings.email = cachedEmail; saveSettings(settings); }
  const emailDisplay = document.getElementById('notifEmailDisplay');
  if (emailDisplay) emailDisplay.textContent = settings.email || '(로그인 후 자동 설정)';

  // 뒤로가기
  document.getElementById('backBtn').addEventListener('click', () => history.back());

  // 마스터 토글
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

  // 요일
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

  // 시
  const hourSelect = document.getElementById('hourSelect');
  for (let h = 0; h < 24; h++) {
    const opt       = document.createElement('option');
    opt.value       = h;
    opt.textContent = String(h).padStart(2,'0') + '시';
    if (h === settings.hour) opt.selected = true;
    hourSelect.appendChild(opt);
  }
  hourSelect.addEventListener('change', () => {
    if (settingsBody.classList.contains('disabled')) return;
    settings.hour = parseInt(hourSelect.value, 10);
    saveSettings(settings);
    updateTimePreview();
  });

  // 분 (더블클릭 직접 입력 포함)
  setupMinuteInput(settings, settingsBody);
  updateTimePreview();

  // 테스트 발송
  document.getElementById('testEmailBtn')?.addEventListener('click', async () => {
    const email = settings.email || localStorage.getItem('qlog_user_email');
    if (!email) { showToast('⚠️ 로그인된 이메일이 없습니다.', true); return; }
    const btn = document.getElementById('testEmailBtn');
    btn.disabled = true; btn.textContent = '발송 중…';
    const ok = await sendEmailNotification(email);
    btn.disabled = false; btn.textContent = '테스트 메일 발송';
    showToast(ok ? `📧 ${email} 로 테스트 메일을 발송했습니다.` : '❌ 발송 실패. EmailJS 설정을 확인해주세요.', !ok);
  });

  // 저장
  document.getElementById('saveBtn').addEventListener('click', () => {
    if (settings.enabled && settings.days.length === 0) {
      showToast('⚠️ 알림 받을 요일을 하나 이상 선택해주세요.', true); return;
    }
    saveSettings(settings);
    if (settings.enabled) startScheduler();
    showToast('✅ 알림 설정이 저장되었습니다.');
    setTimeout(() => history.back(), 1200);
  });

  // 스케줄러 시작
  if (settings.enabled) startScheduler();
});