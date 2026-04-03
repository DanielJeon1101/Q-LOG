import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

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
    .then((userCredential) => {
      alert('가입이 완료되었습니다!');
      location.href = 'index.html';
    })
    .catch((error) => {
      alert('오류: ' + error.message);
    });
});