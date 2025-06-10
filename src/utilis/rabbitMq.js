import amqp from "amqplib";

let connection;
let channel;
let isConnecting = false;

async function connectRabbitMQ() {
    const maxRetries = 5;
    const retryDelay = 3000;

    if (isConnecting) {
        console.log("🔄 Connection attempt already in progress...");
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
        return channel;
    }

    isConnecting = true;
    try {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                connection = await amqp.connect(process.env.RABBITMqURL);
                channel = await connection.createChannel();
                await channel.assertQueue("teacher-ocr-registration", { durable: true });

                connection.on("close", () => {
                    console.error("🔌 RabbitMQ connection closed. Reconnecting...");
                    channel = null;
                    setTimeout(connectRabbitMQ, retryDelay);
                });

                connection.on("error", (err) => {
                    console.error("❌ RabbitMQ connection error:", err.message);
                    channel = null;
                    setTimeout(connectRabbitMQ, retryDelay);
                });

                console.log("✅ Successfully connected to RabbitMQ");
                return channel;
            } catch (error) {
                console.error(`❌ Attempt ${attempt}/${maxRetries} to connect to RabbitMQ failed:`, error.message);
                if (attempt === maxRetries) {
                    throw new Error("Failed to connect to RabbitMQ after multiple attempts");
                }
                await new Promise((resolve) => setTimeout(resolve, retryDelay));
            }
        }
    } finally {
        isConnecting = false;
    }
}

export async function sendDataToQueue(queueName, data) {
    try {
        if (!channel) {
            console.log("🔄 Reconnecting to RabbitMQ...");
            await connectRabbitMQ();
        }
        channel.sendToQueue(queueName, Buffer.from(JSON.stringify(data)), { persistent: true });
        console.log(`📤 Data sent to queue ${queueName}`);
    } catch (error) {
        console.error("❌ Error sending data to queue:", error.message);
        throw error;
    }
}

export async function consumeFromQueue(queueName, callback) {
    try {
        if (!channel) {
            console.log("🔄 Reconnecting to RabbitMQ...");
            await connectRabbitMQ();
        }

        channel.consume(queueName, async (msg) => {
            if (msg !== null) {
                const rawContent = msg.content.toString();
                try {
                    const message = JSON.parse(rawContent);
                    await callback(message);
                    channel.ack(msg);
                    console.log(`✅ Processed message from queue ${queueName}`);
                } catch (error) {
                    console.error("❌ Error processing message:", error.message);
                    console.error("📦 Raw message content:", rawContent);
                    channel.nack(msg, false, true); // Requeue the message
                }
            }
        }, { noAck: false });
        console.log(`👂 Listening to queue ${queueName}`);
    } catch (error) {
        console.error("❌ Error subscribing to queue:", error.message);
        throw error;
    }
}

export function getChannel() {
    if (!channel) {
        throw new Error("Channel not available. Please connect to RabbitMQ first.");
    }
    return channel;
}

export async function closeConnection() {
    try {
        if (channel) {
            await channel.close();
            console.log("✅ Channel closed");
        }
        if (connection) {
            await connection.close();
            console.log("✅ Connection closed");
        }
        channel = null;
        connection = null;
    } catch (error) {
        console.error("❌ Error closing RabbitMQ connection:", error.message);
    }
}