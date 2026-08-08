// api/webhook.js
export default async function handler(req, res) {
    // ============================================================
    // CORS - Biar aman
    // ============================================================
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Qrispy-Signature');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // ============================================================
    // HANYA TERIMA POST
    // ============================================================
    if (req.method !== 'POST') {
        return res.status(405).json({ 
            status: 'error', 
            message: 'Method not allowed. Use POST.' 
        });
    }

    try {
        const payload = req.body;
        const signature = req.headers['x-qrispy-signature'];
        const secret = 'whsec_AVu3fFLUBVMLjo6OdCWq7I3qdQ2CJ6e2';

        // ============================================================
        // 🔒 VERIFIKASI SIGNATURE
        // ============================================================
        const crypto = require('crypto');
        const expectedSignature = crypto
            .createHmac('sha256', secret)
            .update(JSON.stringify(payload))
            .digest('hex');

        const isValid = signature === expectedSignature;

        // ============================================================
        // 📋 LOG WEBHOOK
        // ============================================================
        console.log('📥 Webhook received:', {
            timestamp: new Date().toISOString(),
            event: payload.event,
            signature_valid: isValid,
            signature_received: signature,
            signature_expected: expectedSignature,
            payload: payload
        });

        // ============================================================
        // ❌ JIKA SIGNATURE TIDAK VALID
        // ============================================================
        if (!isValid) {
            console.error('❌ Invalid signature!');
            return res.status(401).json({
                status: 'error',
                message: 'Invalid signature',
                received: signature,
                expected: expectedSignature
            });
        }

        // ============================================================
        // ✅ PROSES WEBHOOK
        // ============================================================
        if (payload.event === 'payment.received') {
            const data = payload.data;
            
            console.log(`💰 Payment received!`);
            console.log(`   QRIS ID: ${data.qris_id}`);
            console.log(`   Amount: Rp ${(data.amount || 0).toLocaleString('id-ID')}`);
            console.log(`   Reference: ${data.payment_reference || '-'}`);
            console.log(`   Paid At: ${data.paid_at}`);

            // ============================================================
            // 📤 KIRIM NOTIFIKASI KE BOT (Via Telegram API)
            // ============================================================
            const BOT_TOKEN = 'YOUR_BOT_TOKEN_HERE'; // Ganti dengan token bot
            const ADMIN_ID = 'YOUR_ADMIN_ID_HERE';   // Ganti dengan ID admin
            const CHANNEL_ID = 'YOUR_CHANNEL_ID_HERE'; // Ganti dengan channel ID

            // Kirim ke admin
            try {
                await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: ADMIN_ID,
                        text: `💰 *PAYMENT RECEIVED!*\n\n` +
                              `📱 QRIS ID: \`${data.qris_id}\`\n` +
                              `💵 Amount: *Rp ${(data.amount || 0).toLocaleString('id-ID')}*\n` +
                              `📝 Reference: ${data.payment_reference || '-'}\n` +
                              `⏰ Paid At: ${data.paid_at}\n\n` +
                              `✅ Deposit berhasil!`,
                        parse_mode: 'Markdown'
                    })
                });
            } catch (e) {
                console.error('❌ Gagal kirim notif ke admin:', e.message);
            }

            // Kirim ke channel (jika ada)
            if (CHANNEL_ID && CHANNEL_ID !== 'YOUR_CHANNEL_ID_HERE') {
                try {
                    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            chat_id: CHANNEL_ID,
                            text: `💰 *DEPOSIT MASUK!*\n\n` +
                                  `💵 Rp ${(data.amount || 0).toLocaleString('id-ID')}\n` +
                                  `📱 QRIS: \`${data.qris_id}\``,
                            parse_mode: 'Markdown'
                        })
                    });
                } catch (e) {
                    console.error('❌ Gagal kirim notif ke channel:', e.message);
                }
            }

            // ============================================================
            // 💾 SIMPAN LOG (Opsional - bisa pakai file atau database)
            // ============================================================
            // Bisa simpan ke file, database, atau kirim ke bot utama
        }

        // ============================================================
        // ✅ RESPON KE QRISPY
        // ============================================================
        return res.status(200).json({
            status: 'success',
            message: 'Webhook processed successfully',
            signature_valid: true,
            event: payload.event,
            processed_at: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Webhook error:', error);
        return res.status(500).json({
            status: 'error',
            message: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
}
