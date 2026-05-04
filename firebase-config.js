// Configuração do Firebase para o projeto mega-sena-sistema
const firebaseConfig = {
  apiKey: "AIzaSyC5qrS22TILW6GYcg-HAgQa44J-QEgNG3Q",
  authDomain: "mega-sena-sistema.firebaseapp.com",
  projectId: "mega-sena-sistema",
  storageBucket: "mega-sena-sistema.firebasestorage.app",
  messagingSenderId: "134457862979",
  appId: "1:134457862979:web:3cc72e9fae7cc828649df6"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const analytics = firebase.analytics();

console.log('🔥 Firebase conectado com sucesso!');
console.log('✅ Projeto: mega-sena-sistema');