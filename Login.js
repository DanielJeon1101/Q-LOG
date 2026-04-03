// Login.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// [주의] Register.js에 있던 본인 프로젝트의 firebaseConfig를 그대로 복사해 넣으십시오.
const firebaseConfig = {
  apiKey: "AIzaSyCY...", // 실제 키로 변경
  authDomain: "q-log-f6aed.firebaseapp.com",
  projectId: "q-log-f6aed",
  storageBucket: "q-log-f6aed.firebasestorage.app",
  messagingSenderId: "373152234648",
  appId: "1:373152234648:web:aa2d94664a5674aca9e4ed"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// 로그인 버튼 클릭 이벤트
document.getElementById('mainBtn').addEventListener('click', function(event) {
  event.preventDefault(); // 기본 폼 제출 동작 방지

  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  // 빈 칸 검사
  if(!email || !password) {
      alert("이메일과 비밀번호를 모두 입력해주세요.");
      return;
  }

  // Firebase 로그인 요청
  signInWithEmailAndPassword(auth, email, password)
    .then((userCredential) => {
      // 로그인 성공
      const user = userCredential.user;
      alert(`환영합니다! 로그인 성공 🎉`);
      location.href = 'index.html'; // 메인 화면으로 이동
    })
    .catch((error) => {
      // 로그인 실패 (비밀번호 틀림, 없는 계정 등)
      console.error(error);
      alert('로그인 실패: 이메일 또는 비밀번호를 확인해주세요.');
    });
});