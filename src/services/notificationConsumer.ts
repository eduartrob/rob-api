import amqplib from 'amqplib';
import { sendResetCodeEmail } from '../servicies/emailService';

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost';
const QUEUE_NAME = 'notifications_queue';

export async function startNotificationConsumer() {
  console.log('Starting notification consumer...');
  try {
    const connection = await amqplib.connect(RABBITMQ_URL);
    const channel = await connection.createChannel();

    await channel.assertQueue(QUEUE_NAME, { durable: true });
    channel.prefetch(1); // Procesar un mensaje a la vez

    console.log(`[*] Waiting for messages in ${QUEUE_NAME}. To exit press CTRL+C`);

    channel.consume(QUEUE_NAME, async (msg) => {
      if (msg !== null) {
        try {
          const event = JSON.parse(msg.content.toString());

          if (event.type === 'PASSWORD_RESET_REQUESTED') {
            const { email, code } = event.payload;
            console.log(`[x] Received PASSWORD_RESET_REQUESTED for ${email}`);
            await sendResetCodeEmail(email, code);
            console.log(`[x] Email sent to ${email}`);
          }
          channel.ack(msg); // Confirma que el mensaje fue procesado
        } catch (error) {
          console.error('Error processing message:', error);
          channel.nack(msg, false, true); // Devuelve el mensaje a la cola para reintentar
        }
      }
    }, { noAck: false }); // noAck: false para confirmación manual
  } catch (error) {
    console.error('Failed to start notification consumer:', error);
  }
}