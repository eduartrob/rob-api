import http from 'http';
import { app } from '../app';

const startServer = () => {
  const server = http.createServer(app);
  const port = Number(process.env.PORT) || 3000; // Asegura que el puerto sea un número
  const host = '0.0.0.0'; // O '127.0.0.1' para localhost, o la IP de tu máquina (ej. '192.168.1.5')

  server.listen(port, host, () => { // CAMBIO AQUÍ: Añade 'host'
    console.log(`Server running on http://${host}:${port}`);
  });
};

export { startServer };