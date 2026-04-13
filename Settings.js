// ── settings.js : 알림 설정 ──────────────────────────────────────────

const STORAGE_KEY = 'qlog_notification_settings';

// 기본 설정값
const defaultSettings = {
  enabled: false,
  days: [],       // 0=일, 1=월, ... 6=토
  hour: 21,
  minute: 0,
};

// 저장된 설정 불러오기
function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...defaultSettings, ...JSON.parse(raw) } : { ...defaultSettings };
  } catch {
    return { ...defaultSettings };
  }
}

// 설정 저장
function saveSettings(settings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

// ── UI 초기화 ──────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const settings = loadSettings();

  // 뒤로가기 버튼
  document.getElementById('backBtn').addEventListener('click', () => {
    history.back();
  });

  // ─ 알림 마스터 토글 ─────────────────────────────────────────────────
  const masterToggle = document.getElementById('notifToggle');
  const settingsBody = document.getElementById('settingsBody');

  function applyMasterToggle(enabled) {
    masterToggle.checked = enabled;
    settingsBody.classList.toggle('disabled', !enabled);
    document.getElementById('toggleStatusText').textContent = enabled ? '켜짐' : '꺼짐';
  }

  applyMasterToggle(settings.enabled);

  masterToggle.addEventListener('change', () => {
    settings.enabled = masterToggle.checked;
    applyMasterToggle(settings.enabled);

    if (settings.enabled) {
      requestNotificationPermission();
    }
    saveSettings(settings);
    showToast(settings.enabled ? '알림이 활성화되었습니다.' : '알림이 비활성화되었습니다.');
  });

  // ─ 요일 선택 ────────────────────────────────────────────────────────
  const dayBtns = document.querySelectorAll('.day-btn');

  // 저장된 요일 반영
  dayBtns.forEach(btn => {
    const dayIdx = parseInt(btn.dataset.day, 10);
    if (settings.days.includes(dayIdx)) btn.classList.add('active');
  });

  dayBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      if (settingsBody.classList.contains('disabled')) return;
      const dayIdx = parseInt(btn.dataset.day, 10);
      btn.classList.toggle('active');
      if (btn.classList.contains('active')) {
        if (!settings.days.includes(dayIdx)) settings.days.push(dayIdx);
      } else {
        settings.days = settings.days.filter(d => d !== dayIdx);
      }
      saveSettings(settings);
    });
  });

  // ─ 시간 설정 ────────────────────────────────────────────────────────
  const hourSelect   = document.getElementById('hourSelect');
  const minuteSelect = document.getElementById('minuteSelect');

  // 시간 옵션 생성
  for (let h = 0; h < 24; h++) {
    const opt = document.createElement('option');
    opt.value = h;
    opt.textContent = String(h).padStart(2, '0') + '시';
    if (h === settings.hour) opt.selected = true;
    hourSelect.appendChild(opt);
  }

  // 분 옵션 생성 (5분 단위)
  [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].forEach(m => {
    const opt = document.createElement('option');
    opt.value = m;
    opt.textContent = String(m).padStart(2, '0') + '분';
    if (m === settings.minute) opt.selected = true;
    minuteSelect.appendChild(opt);
  });

  hourSelect.addEventListener('change', () => {
    if (settingsBody.classList.contains('disabled')) return;
    settings.hour = parseInt(hourSelect.value, 10);
    saveSettings(settings);
    updateTimePreview();
  });

  minuteSelect.addEventListener('change', () => {
    if (settingsBody.classList.contains('disabled')) return;
    settings.minute = parseInt(minuteSelect.value, 10);
    saveSettings(settings);
    updateTimePreview();
  });

  updateTimePreview();

  // ─ 저장 버튼 ────────────────────────────────────────────────────────
  document.getElementById('saveBtn').addEventListener('click', () => {
    if (settings.enabled && settings.days.length === 0) {
      showToast('⚠️ 알림 받을 요일을 하나 이상 선택해주세요.', true);
      return;
    }
    saveSettings(settings);
    showToast('✅ 알림 설정이 저장되었습니다.');
    setTimeout(() => history.back(), 1200);
  });

  // ─ 미리보기 텍스트 업데이트 ─────────────────────────────────────────
  function updateTimePreview() {
    const h = parseInt(hourSelect.value, 10);
    const m = parseInt(minuteSelect.value, 10);
    const ampm   = h < 12 ? '오전' : '오후';
    const h12    = h % 12 === 0 ? 12 : h % 12;
    const mStr   = String(m).padStart(2, '0');
    document.getElementById('timePreview').textContent =
      `${ampm} ${h12}:${mStr}`;
  }
});

// ── 알림 권한 요청 ─────────────────────────────────────────────────────
function requestNotificationPermission() {
  if (!('Notification' in window)) {
    showToast('⚠️ 이 브라우저는 알림을 지원하지 않습니다.', true);
    return;
  }
  if (Notification.permission === 'granted') return;
  if (Notification.permission !== 'denied') {
    Notification.requestPermission().then(permission => {
      if (permission !== 'granted') {
        showToast('⚠️ 알림 권한이 거부되었습니다. 브라우저 설정에서 허용해주세요.', true);
      }
    });
  }
}

// ── 토스트 메시지 ──────────────────────────────────────────────────────
function showToast(msg, isError = false) {
  const existing = document.querySelector('.settings-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'settings-toast' + (isError ? ' error' : '');
  toast.textContent = msg;
  document.body.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add('visible'));
  setTimeout(() => {
    toast.classList.remove('visible');
    setTimeout(() => toast.remove(), 400);
  }, 2400);
}