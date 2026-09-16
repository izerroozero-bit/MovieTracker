// auth.js

// Функция переключения между Входом и Регистрацией
function toggleAuth() {
    const login = document.getElementById('login-section');
    const signup = document.getElementById('signup-section');
    if (login.style.display === 'none') {
        login.style.display = 'block';
        signup.style.display = 'none';
    } else {
        login.style.display = 'none';
        signup.style.display = 'block';
    }
}

// Регистрация нового пользователя
const signupForm = document.getElementById('signup-form');
if (signupForm) {
    signupForm.onsubmit = function(e) {
        e.preventDefault();
        const username = this.querySelector('input[type="text"]').value;
        const email = this.querySelector('input[type="email"]').value;
        const password = this.querySelector('input[type="password"]').value;

        const userData = { username, email, password };
        
        // Имитация базы данных: сохраняем пользователя
        localStorage.setItem('user', JSON.stringify(userData));
        localStorage.setItem('isLoggedIn', 'true');

        alert('Регистрация успешна!');
        window.location.href = 'index.html'; 
    };
}

// Вход в систему
const loginForm = document.getElementById('login-section');
if (loginForm) {
    const form = loginForm.querySelector('form');
    form.onsubmit = function(e) {
        e.preventDefault();
        const email = this.querySelector('input[type="email"]').value;
        const password = this.querySelector('input[type="password"]').value;

        const savedUser = JSON.parse(localStorage.getItem('user'));

        if (savedUser && savedUser.email === email && savedUser.password === password) {
            localStorage.setItem('isLoggedIn', 'true');
            window.location.href = 'index.html';
        } else {
            alert('Неверный email или пароль. Попробуйте еще раз.');
        }
    };
}