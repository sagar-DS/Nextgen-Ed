// frontend/auth.js

document.addEventListener('DOMContentLoaded', () => {
    const API_BASE_URL = 'http://127.0.0.1:8000';
    
    const loginForm = document.getElementById('login-form');
    const loginError = document.getElementById('login-error');

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

    // We can add the registration logic here later if needed
    // For now, use the /docs page to register
});