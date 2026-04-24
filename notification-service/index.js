const amqp = require('amqplib');

async function start() {
    try {
        const connection = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://localhost');
        const channel = await connection.createChannel();
        await channel.assertQueue('order_notifications');
        
        console.log('Notification Service waiting for messages...');
        
        channel.consume('order_notifications', (msg) => {
            if (msg !== null) {
                const event = JSON.parse(msg.content.toString());
                console.log(`[Notification Simulated] Sending email/SMS for event: ${event.event}, Order ID: ${event.orderId}`);
                channel.ack(msg);
            }
        });
    } catch (err) {
        console.error('RabbitMQ connection failed, retrying in 5s...');
        setTimeout(start, 5000);
    }
}

start();
