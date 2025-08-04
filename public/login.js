document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('adminLoginForm');
    const messageDiv = document.getElementById('message');

    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault(); // Evitar el envío por defecto del formulario

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        messageDiv.textContent = ''; // Limpiar mensajes anteriores

        try {
            const response = await fetch('http://localhost:3000/api/users/admin/login', { // ¡Asegúrate que el puerto coincida con tu server.js!
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();

            if (response.ok) {
                // Login exitoso, redirigir al panel de administración
                window.location.href = 'admin.html';
            } else {
                messageDiv.textContent = data.message || 'Error al iniciar sesión.';
                messageDiv.classList.add('error-message');
                messageDiv.classList.remove('status-message');
            }
        } catch (error) {
            console.error('Error de red:', error);
            messageDiv.textContent = 'Error de conexión con el servidor.';
            messageDiv.classList.add('error-message');
            messageDiv.classList.remove('status-message');
        }
    });
});