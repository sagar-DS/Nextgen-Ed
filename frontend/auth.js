// frontend/auth.js

document.addEventListener('DOMContentLoaded', () => {
    const API_BASE_URL = 'https://nextgen-ed.onrender.com';
    
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const loginError = document.getElementById('login-error');
    const registerError = document.getElementById('register-error');
    const showRegisterLink = document.getElementById('show-register');
    const showLoginLink = document.getElementById('show-login');
    const loginSwitch = document.getElementById('login-switch');
    const registerSwitch = document.getElementById('register-switch');

    // Redirect to main app if already logged in
    if (localStorage.getItem('access_token')) {
        window.location.href = 'index.html';
    }

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        // FastAPI's token endpoint expects form data, not JSON
        const formData = new URLSearchParams();
        formData.append('username', email);
        formData.append('password', password);

        try {
            const response = await fetch(`${API_BASE_URL}/token`, {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || 'Login failed');
            }

            localStorage.setItem('access_token', data.access_token);
            window.location.href = 'index.html'; // Redirect to the main app

        } catch (error) {
            loginError.textContent = error.message;
            loginError.style.display = 'block';
        }
    });

    // Registration form submission
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        const confirmPassword = document.getElementById('register-confirm-password').value;

        // Clear previous errors
        registerError.style.display = 'none';
        registerError.textContent = '';

        // Validate passwords match
        if (password !== confirmPassword) {
            registerError.textContent = 'Passwords do not match';
            registerError.style.display = 'block';
            return;
        }

        // Validate password length
        if (password.length < 6) {
            registerError.textContent = 'Password must be at least 6 characters long';
            registerError.style.display = 'block';
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/users/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: email,
                    password: password
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || 'Registration failed');
            }

            // Registration successful, show success message and switch to login
            registerError.textContent = 'Registration successful! Please log in.';
            registerError.style.color = '#10B981';
            registerError.style.display = 'block';
            
            // Switch to login form
            showLoginForm();

        } catch (error) {
            registerError.textContent = error.message;
            registerError.style.color = '#E53E3E';
            registerError.style.display = 'block';
        }
    });

    // Form switching functions
    function showLoginForm() {
        loginForm.style.display = 'block';
        registerForm.style.display = 'none';
        loginSwitch.style.display = 'block';
        registerSwitch.style.display = 'none';
        document.querySelector('.auth-box p').textContent = 'Please log in to continue.';
    }

    function showRegisterForm() {
        loginForm.style.display = 'none';
        registerForm.style.display = 'block';
        loginSwitch.style.display = 'none';
        registerSwitch.style.display = 'block';
        document.querySelector('.auth-box p').textContent = 'Create a new account.';
    }

    // Event listeners for form switching
    showRegisterLink.addEventListener('click', (e) => {
        e.preventDefault();
        showRegisterForm();
    });

    showLoginLink.addEventListener('click', (e) => {
        e.preventDefault();
        showLoginForm();
    });
});