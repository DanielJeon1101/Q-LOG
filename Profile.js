// Profile.js — Firebase 인증 연동 프로필 화면
import { initializeApp }        from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
    getAuth,
    onAuthStateChanged,
    updateProfile,
    signOut,
    sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

/* ── Firebase 초기화 ── */
const firebaseConfig = {
    apiKey:            "AIzaSyCYkG8uZUET5UnW80IHKGxhL7WpNCp7kfQ",
    authDomain:        "q-log-f6aed.firebaseapp.com",
    projectId:         "q-log-f6aed",
    storageBucket:     "q-log-f6aed.firebasestorage.app",
    messagingSenderId: "373152234648",
    appId:             "1:373152234648:web:aa2d94664a5674aca9e4ed"
};

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);

/* ══════════════════════════════════════════
   로그인 상태 감지 → UI 전환
   ══════════════════════════════════════════ */
onAuthStateChanged(auth, (user) => {
    const guest    = document.getElementById('profileGuest');
    const loggedIn = document.getElementById('profileLoggedIn');

    if (user) {
        // 로그인 상태
        guest.style.display    = 'none';
        loggedIn.style.display = 'flex';
        renderProfile(user);
    } else {
        // 비로그인 상태
        guest.style.display    = 'flex';
        loggedIn.style.display = 'none';
    }
});

/* ── 프로필 정보 렌더링 ── */
function renderProfile(user) {
    // 이름 (displayName이 없으면 이메일 앞부분 사용)
    const displayName = user.displayName
        || user.email.split('@')[0]
        || '사용자';

    document.getElementById('profileDisplayName').textContent = displayName;
    document.getElementById('profileDisplayEmail').textContent = user.email;

    // 프로필 사진 (Firebase photoURL, localStorage 저장 사진, 기본 아바타 순)
    const savedPhoto = localStorage.getItem('qlog_avatar_' + user.uid);
    const photoSrc   = savedPhoto || user.photoURL || null;

    if (photoSrc) {
        document.getElementById('profileAvatar').src = photoSrc;
    }
    // photoSrc가 없으면 기본 SVG 아바타 유지
}

/* ══════════════════════════════════════════
   아바타 이미지 변경 (로컬 미리보기 + localStorage 저장)
   ══════════════════════════════════════════ */
document.getElementById('avatarFileInput').addEventListener('change', function (e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
        const dataUrl = ev.target.result;
        document.getElementById('profileAvatar').src = dataUrl;

        // 현재 로그인 유저 uid 기준으로 저장
        const user = auth.currentUser;
        if (user) {
            try {
                localStorage.setItem('qlog_avatar_' + user.uid, dataUrl);
                showProfileToast('프로필 사진이 변경되었습니다. ✅');
            } catch (err) {
                // 5MB 이상 이미지는 localStorage 용량 초과
                showProfileToast('이미지가 너무 큽니다. 더 작은 이미지를 사용하세요.');
            }
        }
    };
    reader.readAsDataURL(file);
});

/* ══════════════════════════════════════════
   프로필 수정 모달 (Bottom Sheet)
   ══════════════════════════════════════════ */
const overlay    = document.getElementById('editModalOverlay');
const editNameIn = document.getElementById('editNameInput');
const editEmailIn= document.getElementById('editEmailInput');

document.getElementById('editProfileBtn').addEventListener('click', () => {
    const user = auth.currentUser;
    if (!user) return;
    // 현재 값 채우기
    editNameIn.value  = user.displayName || '';
    editEmailIn.value = user.email;
    openEditModal();
});

document.getElementById('editCancelBtn').addEventListener('click', closeEditModal);

// 배경 클릭 시 닫기
overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeEditModal();
});

function openEditModal()  { overlay.classList.add('show'); }
function closeEditModal() { overlay.classList.remove('show'); }

/* 저장 */
document.getElementById('editSaveBtn').addEventListener('click', async () => {
    const user    = auth.currentUser;
    const newName = editNameIn.value.trim();

    if (!user)     { showProfileToast('로그인 상태가 아닙니다.'); return; }
    if (!newName)  { showProfileToast('이름을 입력해주세요.'); return; }

    try {
        await updateProfile(user, { displayName: newName });
        // UI 즉시 반영
        document.getElementById('profileDisplayName').textContent = newName;
        closeEditModal();
        showProfileToast('프로필이 저장되었습니다. 🎉');
    } catch (err) {
        console.error(err);
        showProfileToast('저장 중 오류가 발생했습니다.');
    }
});

/* ══════════════════════════════════════════
   메뉴 항목 이벤트
   ══════════════════════════════════════════ */

/* 나의 작성능력 → 통계 화면으로 이동 */
document.getElementById('menuWritingStats').addEventListener('click', () => {
    // index.html의 go() 함수 호출
    if (typeof go === 'function') go('stats');
});

/* 계정 및 로그인 → 계정 정보 시트 */
document.getElementById('menuAccountLogin').addEventListener('click', () => {
    const user = auth.currentUser;
    if (!user) return;

    const provider = user.providerData[0]?.providerId || 'email';
    const providerLabel = provider === 'google.com' ? 'Google 계정' : '이메일/비밀번호';
    const joined = user.metadata.creationTime
        ? new Date(user.metadata.creationTime).toLocaleDateString('ko-KR')
        : '알 수 없음';

    showProfileToast(`가입: ${joined}  |  인증: ${providerLabel}`);
});

/* 비밀번호 변경 → forgot-password.html 이동 */
document.getElementById('menuChangePassword').addEventListener('click', () => {
    const user = auth.currentUser;
    if (!user) return;

    // Google 계정은 비밀번호 변경 불가
    const isGoogle = user.providerData.some(p => p.providerId === 'google.com');
    if (isGoogle) {
        showProfileToast('Google 계정은 비밀번호를 변경할 수 없습니다.');
        return;
    }

    // 이메일로 재설정 링크 발송 후 이동
    sendPasswordResetEmail(auth, user.email)
        .then(() => {
            showProfileToast('비밀번호 재설정 이메일을 발송했습니다. 📧');
            setTimeout(() => { location.href = 'forgot-password.html'; }, 1500);
        })
        .catch(() => {
            // 실패해도 페이지는 이동
            location.href = 'forgot-password.html';
        });
});

/* ══════════════════════════════════════════
   로그아웃
   ══════════════════════════════════════════ */
document.getElementById('logoutBtn').addEventListener('click', async () => {
    const ok = confirm('로그아웃 하시겠습니까?');
    if (!ok) return;

    try {
        await signOut(auth);
        showProfileToast('로그아웃 되었습니다.');
        // 비로그인 UI는 onAuthStateChanged가 자동으로 처리
    } catch (err) {
        console.error(err);
        showProfileToast('로그아웃 중 오류가 발생했습니다.');
    }
});

/* ══════════════════════════════════════════
   토스트 유틸리티
   ══════════════════════════════════════════ */
function showProfileToast(msg) {
    const t = document.getElementById('profileToast');
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2800);
}