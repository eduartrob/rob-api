document.addEventListener('DOMContentLoaded', () => {
    const userTableBody = document.querySelector('#userTable tbody');
    const sendToAllForm = document.getElementById('sendToAllForm');
    const allTitleInput = document.getElementById('allTitle');
    const allBodyInput = document.getElementById('allBody');
    const allMessageDiv = document.getElementById('allMessage');
    const userListMessageDiv = document.getElementById('userListMessage');

    const BACKEND_URL = 'http://localhost:3000';

    async function authenticatedFetch(url, options = {}) {
        if (options.method === 'GET') {

        }


        const defaultHeaders = { 'Content-Type': 'application/json' };
        const combinedHeaders = { ...defaultHeaders, ...options.headers };

        const fetchOptions = {
            ...options,
            headers: combinedHeaders,
        };

        return fetch(url, fetchOptions);
    }


    // Cargar usuarios al iniciar
    async function loadUsers() {
        userTableBody.innerHTML = ''; 
        userListMessageDiv.textContent = 'Cargando usuarios...';
        userListMessageDiv.className = 'status-message';

        try {

            const response = await authenticatedFetch(`${BACKEND_URL}/api/users/all`, {
                method: 'GET',
            });
            
            const data = await response.json();

            if (response.ok) {
                if (data.length === 0) {
                    userListMessageDiv.textContent = 'No hay usuarios registrados.';
                    userListMessageDiv.className = 'status-message';
                } else {
                    userListMessageDiv.textContent = ''; // Limpiar mensaje si hay usuarios
                    data.forEach(user => {
                        const row = userTableBody.insertRow();
                        row.insertCell().textContent = user.name;
                        row.insertCell().textContent = user.email;
                        row.insertCell().textContent = user.phone;
                        row.insertCell().textContent = user.region || 'N/A';
                        row.insertCell().textContent = user.fcmTokens.length > 0 ? user.fcmTokens.join(', ') : 'Ninguno';

                        const actionCell = row.insertCell();
                        const sendButton = document.createElement('button');
                        sendButton.textContent = 'Enviar Mensaje';
                        sendButton.onclick = () => showSendMessageModal(user); // Pasa el objeto user
                        actionCell.appendChild(sendButton);
                    });
                }
            } else {
                userListMessageDiv.textContent = data.message || 'Error al cargar usuarios.';
                userListMessageDiv.className = 'error-message';
            }
        } catch (error) {
            console.error('Error de red al cargar usuarios:', error);
            userListMessageDiv.textContent = 'Error de conexión con el servidor al cargar usuarios.';
            userListMessageDiv.className = 'error-message';
        }
    }

    // Modal para enviar mensaje a un usuario específico
    function showSendMessageModal(user) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <h3>Enviar Mensaje a ${user.name} (${user.email})</h3>
                <div class="form-group">
                    <label for="userMessageTitle">Título:</label>
                    <input type="text" id="userMessageTitle" required>
                </div>
                <div class="form-group">
                    <label for="userMessageBody">Mensaje:</label>
                    <textarea id="userMessageBody" rows="3" required></textarea>
                </div>
                <button id="sendUserMessageBtn">Enviar</button>
                <button id="closeModalBtn">Cancelar</button>
                <p id="userMessageStatus" class="status-message"></p>
            </div>
        `;
        document.body.appendChild(modal);

        // Estilos básicos para el modal (añadir a style.css)
        const modalStyle = document.createElement('style');
        modalStyle.textContent = `
            .modal {
                position: fixed;
                z-index: 1;
                left: 0;
                top: 0;
                width: 100%;
                height: 100%;
                overflow: auto;
                background-color: rgba(0,0,0,0.4);
                display: flex;
                justify-content: center;
                align-items: center;
            }
            .modal-content {
                background-color: #fefefe;
                margin: auto;
                padding: 20px;
                border: 1px solid #888;
                width: 80%;
                max-width: 500px;
                border-radius: 8px;
                box-shadow: 0 4px 8px rgba(0,0,0,0.2);
            }
            .modal-content button {
                margin-right: 10px;
            }
            .modal-content .status-message, .modal-content .error-message {
                margin-top: 15px;
            }
        `;
        document.head.appendChild(modalStyle);


        const sendUserMessageBtn = modal.querySelector('#sendUserMessageBtn');
        const closeModalBtn = modal.querySelector('#closeModalBtn');
        const userMessageTitleInput = modal.querySelector('#userMessageTitle');
        const userMessageBodyInput = modal.querySelector('#userMessageBody');
        const userMessageStatusDiv = modal.querySelector('#userMessageStatus');

        closeModalBtn.onclick = () => modal.remove();

        sendUserMessageBtn.onclick = async () => {
            const title = userMessageTitleInput.value;
            const body = userMessageBodyInput.value;

            if (!title || !body) {
                userMessageStatusDiv.textContent = 'Título y mensaje son obligatorios.';
                userMessageStatusDiv.className = 'error-message';
                return;
            }

            userMessageStatusDiv.textContent = 'Enviando mensaje...';
            userMessageStatusDiv.className = 'status-message';

            try {
                const response = await authenticatedFetch(`${BACKEND_URL}/api/users/admin/sendNotificationToUser`, {
                    method: 'POST',
                    body: JSON.stringify({
                        userId: user._id, // Usamos el ID de Mongoose
                        title: title,
                        body: body,
                    }),
                });

                const data = await response.json();

                if (response.ok) {
                    userMessageStatusDiv.textContent = data.message;
                    userMessageStatusDiv.className = 'status-message';
                } else {
                    userMessageStatusDiv.textContent = data.message || 'Error al enviar mensaje.';
                    userMessageStatusDiv.className = 'error-message';
                }
            } catch (error) {
                console.error('Error de red al enviar mensaje a usuario:', error);
                userMessageStatusDiv.textContent = 'Error de conexión con el servidor.';
                userMessageStatusDiv.className = 'error-message';
            }
        };
    }


    // Enviar mensaje a todos los usuarios
    sendToAllForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const title = allTitleInput.value;
        const body = allBodyInput.value;

        if (!title || !body) {
            allMessageDiv.textContent = 'Título y mensaje son obligatorios.';
            allMessageDiv.className = 'error-message';
            return;
        }

        allMessageDiv.textContent = 'Enviando mensaje a todos...';
        allMessageDiv.className = 'status-message';

        try {
            const response = await authenticatedFetch(`${BACKEND_URL}/api/users/admin/sendNotificationToAll`, {
                method: 'POST',
                body: JSON.stringify({ title, body }),
            });

            const data = await response.json();

            if (response.ok) {
                allMessageDiv.textContent = data.message;
                allMessageDiv.className = 'status-message';
                allTitleInput.value = ''; // Limpiar campos
                allBodyInput.value = '';
            } else {
                allMessageDiv.textContent = data.message || 'Error al enviar mensaje a todos.';
                allMessageDiv.className = 'error-message';
            }
        } catch (error) {
            console.error('Error de red al enviar mensaje a todos:', error);
            allMessageDiv.textContent = 'Error de conexión con el servidor.';
            allMessageDiv.className = 'error-message';
        }
    });

    // Iniciar carga de usuarios
    loadUsers();
});