const amqp = require('amqplib');
const nodemailer = require('nodemailer');

async function createTransporter() {
    const testAccount = await nodemailer.createTestAccount();
    return nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false,
        auth: {
            user: testAccount.user,
            pass: testAccount.pass,
        },
    });
}

function formatOrderItemsHtml(order) {
    if (!order.items) return '<p>Legacy order (no item details)</p>';
    const itemsHtml = order.items.map(item => `<li>${item.name} - ${item.liters} L (₹${item.cost})</li>`).join('');
    return `<ul>${itemsHtml}</ul>
            <p><strong>Total Cost:</strong> ₹${order.total_cost}</p>
            <p><strong>Labour Requested:</strong> ${order.requires_labour ? 'Yes' : 'No'}</p>`;
}

async function start() {
    try {
        const connection = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://localhost');
        const channel = await connection.createChannel();
        await channel.assertQueue('order_notifications');
        
        const transporter = await createTransporter();
        console.log('Notification Service waiting for messages... (Emails active via Ethereal)');
        
        channel.consume('order_notifications', async (msg) => {
            if (msg !== null) {
                const data = JSON.parse(msg.content.toString());
                
                try {
                    let info;
                    if (data.event === 'ORDER_PLACED' && data.userEmail) {
                        info = await transporter.sendMail({
                            from: '"VK Paints" <no-reply@vkpaints.com>',
                            to: data.userEmail,
                            subject: `Order Confirmation - #${data.orderId}`,
                            html: `<h3>Thank you for your order!</h3>
                                   <p>Your order #${data.orderId} has been successfully placed.</p>
                                   ${formatOrderItemsHtml(data.order)}`
                        });
                        console.log(`[Email Sent to Customer] Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
                    } 
                    else if (data.event === 'NOTIFY_RETAILER' && data.email) {
                        info = await transporter.sendMail({
                            from: '"VK Paints Admin" <admin@vkpaints.com>',
                            to: data.email,
                            subject: `New Fulfillment Request - Order #${data.order.id}`,
                            html: `<h3>New Order Fulfillment</h3>
                                   <p>Please prepare the following items for Order #${data.order.id}:</p>
                                   ${formatOrderItemsHtml(data.order)}`
                        });
                        console.log(`[Email Sent to Retailer] Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
                    }
                    else if (data.event === 'NOTIFY_CUSTOMER' && data.email) {
                        info = await transporter.sendMail({
                            from: '"VK Paints" <no-reply@vkpaints.com>',
                            to: data.email,
                            subject: `Order Update - #${data.order.id}`,
                            html: `<h3>Update on your Order #${data.order.id}</h3>
                                   <p>Your order status has been updated to: <strong>${data.order.status}</strong></p>
                                   ${formatOrderItemsHtml(data.order)}`
                        });
                        console.log(`[Email Sent to Customer] Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
                    }
                } catch(e) {
                    console.error("Failed to send email", e);
                }

                channel.ack(msg);
            }
        });
    } catch (err) {
        console.error('RabbitMQ connection failed, retrying in 5s...', err.message);
        setTimeout(start, 5000);
    }
}

start();
