import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

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

// ✅ 페이지 로드 시 회원가입에서 넘어온 정보가 있는지 확인
window.addEventListener('DOMContentLoaded', () => {
  const savedEmail = localStorage.getItem('tempEmail');
  const savedPassword = localStorage.getItem('tempPassword');

  if (savedEmail && savedPassword) {
    document.getElementById('email').value = savedEmail;
    document.getElementById('password').value = savedPassword;

    // 정보를 한 번 사용한 후에는 보안을 위해 삭제
    localStorage.removeItem('tempEmail');
    localStorage.removeItem('tempPassword');
  }
});

document.getElementById('mainBtn').addEventListener('click', function(event) {
  event.preventDefault();

  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  if (!email || !password) {
    alert("이메일과 비밀번호를 모두 입력해주세요.");
    return;
  }

  signInWithEmailAndPassword(auth, email, password)
   .then((userCredential) => {
    const user = userCredential.user;

    localStorage.setItem('isLogin', 'true');
    localStorage.setItem('userEmail', user.email);

    alert(`환영합니다! 로그인 성공 🎉`);
    location.href = 'index.html';
  })
    .catch((error) => {
      console.error(error);
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        alert('이메일 또는 비밀번호가 올바르지 않습니다.');
      } else if (error.code === 'auth/invalid-email') {
        alert('이메일 형식이 올바르지 않습니다.');
      } else if (error.code === 'auth/too-many-requests') {
        alert('로그인 시도가 너무 많습니다. 잠시 후 다시 시도해주세요.');
      } else {
        alert('로그인 실패: ' + error.message);
      }
    });
});