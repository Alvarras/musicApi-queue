import nodemailer from 'nodemailer';

class MailService {
    constructor() {
        const port = parseInt(process.env.SMTP_PORT);
        this._transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: port,
            secure: port === 465, 
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASSWORD,
            },
        });
    }

    async sendEmail(targetEmail, content) {
        try {
            const message = {
                from: process.env.SMTP_USER,
                to: targetEmail,
                subject: 'Export Playlist',
                text: 'Berikut adalah hasil export playlist Anda',
                attachments: [
                    {
                        filename: 'playlist.json',
                        content: JSON.stringify(content, null, 2),
                    },
                ],
            };

            const result = await this._transporter.sendMail(message);
            console.log('[MailService] Email sent successfully:', result.messageId);
            return result;
        } catch (error) {
            console.error('[MailService] Failed to send email:', error.message);
            throw error;
        }
    }
}

export default MailService;
