// Import the functions you need from the SDKs you need
  import { initializeApp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js";
  import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-analytics.js";
  // TODO: Add SDKs for Firebase products that you want to use
  // https://firebase.google.com/docs/web/setup#available-libraries

  // Your web app's Firebase configuration
  // For Firebase JS SDK v7.20.0 and later, measurementId is optional
  const firebaseConfig = {
    apiKey: "AIzaSyCYkG8uZUET5UnW80IHKGxhL7WpNCp7kfQ",
    authDomain: "q-log-f6aed.firebaseapp.com",
    projectId: "q-log-f6aed",
    storageBucket: "q-log-f6aed.firebasestorage.app",
    messagingSenderId: "373152234648",
    appId: "1:373152234648:web:aa2d94664a5674aca9e4ed",
    measurementId: "G-TWK7RMPLR6"
  };

  // Initialize Firebase
  const app = initializeApp(firebaseConfig);
  const analytics = getAnalytics(app);