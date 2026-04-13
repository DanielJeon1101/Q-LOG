import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyCYkG8uZUET5UnW80IHKGxhL7WpNCp7kfQ",
  authDomain: "q-log-f6aed.firebaseapp.com",
  projectId: "q-log-f6aed",
  storageBucket: "q-log-f6aed.firebasestorage.app",
  messagingSenderId: "373152234648",
  appId: "1:373152234648:web:aa2d94664a5674aca9e4ed"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

document.getElementById('submit').addEventListener('click', function(event) {
  event.preventDefault();

  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  createUserWithEmailAndPassword(auth, email, password)
    .then(async (userCredential) => {
      // ✅ 회원가입 성공 후 자동 로그인 방지를 위해 즉시 로그아웃
      await signOut(auth);

      // ✅ 로그인 화면에 전달할 정보를 저장
      localStorage.setItem('tempEmail', email);
      localStorage.setItem('tempPassword', password);

      alert('가입이 완료되었습니다! 로그인 페이지로 이동합니다.');
      location.href = 'login.html'; // 로그인 페이지 파일명에 맞춰 수정하세요
    })
    .catch((error) => {
      alert('오류: ' + error.message);
    });
});