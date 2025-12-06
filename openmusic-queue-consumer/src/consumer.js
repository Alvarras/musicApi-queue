import amqp from 'amqplib';
import dotenv from 'dotenv';
import PlaylistService from './PlaylistService.js';
import MailService from './MailService.js';

dotenv.config();

const playlistService = new PlaylistService();
const mailService = new MailService();

async function main() {
    try {
        // Validate environment variables
        if (!process.env.RABBITMQ_SERVER) {
            throw new Error('RABBITMQ_SERVER environment variable is required');
        }
        if (!process.env.SMTP_HOST || !process.env.SMTP_PORT || 
            !process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
            throw new Error('SMTP configuration environment variables are required');
        }

        console.log('[Consumer] Connecting to RabbitMQ...');
        const connection = await amqp.connect(process.env.RABBITMQ_SERVER);
        const channel = await connection.createChannel();

        const queue = 'export:playlist';
        await channel.assertQueue(queue, { durable: true });

        console.log(`[Consumer] Waiting for messages in queue: ${queue}`);

        channel.consume(
            queue,
            async (msg) => {
                try {
                    const { playlistId, targetEmail } = JSON.parse(msg.content.toString());
                    
                    console.log(`[Consumer] Processing export request for playlist: ${playlistId}`);
                    console.log(`[Consumer] Target email: ${targetEmail}`);

                    // Get playlist data from database
                    const playlistData = await playlistService.getPlaylistById(playlistId);

                    // Send email with playlist data
                    await mailService.sendEmail(targetEmail, playlistData);

                    console.log(`[Consumer] Successfully exported playlist to ${targetEmail}`);
                    
                    // Acknowledge the message
                    channel.ack(msg);
                } catch (error) {
                    console.error('[Consumer] Error processing message:', error.message);
                    
                    // If playlist not found or email error, reject without requeue
                    // to prevent infinite loop
                    if (error.message.includes('tidak ditemukan') || 
                        error.message.includes('not found')) {
                        console.error('[Consumer] Playlist not found - rejecting message');
                        channel.nack(msg, false, false); // Don't requeue
                    } else {
                        // For other errors (network issues, etc), requeue
                        console.error('[Consumer] Temporary error - requeuing message');
                        channel.nack(msg, false, true); // Requeue
                    }
                }
            },
            { noAck: false }
        );

        // Handle connection errors
        connection.on('error', (err) => {
            console.error('[Consumer] Connection error:', err.message);
        });

        connection.on('close', () => {
            console.log('[Consumer] Connection closed');
            process.exit(1);
        });

    } catch (error) {
        console.error('[Consumer] Failed to start consumer:', error.message);
        process.exit(1);
    }
}

main();
