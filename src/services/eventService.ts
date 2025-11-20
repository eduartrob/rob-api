import amqplib from 'amqplib';

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost';
const QUEUE_NAME = 'notifications_queue';

let connection: amqplib.Connection | null = null;
let channel: amqplib.Channel | null = null;

async function connectRabbitMQ() {
  if (channel) return;
  try {
    connection = await amqplib.connect(RABBITMQ_URL);
    channel = await connection.createChannel();
    await channel.assertQueue(QUEUE_NAME, { durable: true });
    console.log('Publisher connected to RabbitMQ and queue asserted.');
  } catch (error) {
    console.error('Failed to connect to RabbitMQ:', error);
    // Aquí podrías implementar una lógica de reintento
  }
}

export async function publishPasswordResetEvent(email: string, code: string): Promise<void> {
  if (!channel) {
    await connectRabbitMQ();
  }
  if (!channel) {
    throw new Error("Cannot publish event: RabbitMQ channel is not available.");
  }

  const event = { type: 'PASSWORD_RESET_REQUESTED', payload: { email, code } };
  channel.sendToQueue(QUEUE_NAME, Buffer.from(JSON.stringify(event)), { persistent: true });
}