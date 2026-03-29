const TELEGRAM_API = 'https://api.telegram.org';

async function sendTelegramMessage(botToken, chatId, text) {
  if (!botToken || !chatId || !text) return false;
  try {
    const res = await fetch(`${TELEGRAM_API}/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
    });
    if (!res.ok) {
      const body = await res.text();
      console.error('[telegram] sendMessage failed:', res.status, body);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[telegram] sendMessage error:', err.message);
    return false;
  }
}

async function sendTelegramPhoto(botToken, chatId, photoUrl, caption) {
  if (!botToken || !chatId || !photoUrl) return false;
  try {
    const res = await fetch(`${TELEGRAM_API}/bot${botToken}/sendPhoto`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        photo: photoUrl,
        caption: caption || '',
        parse_mode: 'HTML',
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      console.error('[telegram] sendPhoto failed:', res.status, body);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[telegram] sendPhoto error:', err.message);
    return false;
  }
}

function sendAdminNotification(text) {
  const botToken = process.env.ADMIN_TELEGRAM_BOT_TOKEN;
  const chatId = process.env.ADMIN_TELEGRAM_CHAT_ID;
  if (!botToken || !chatId) return;
  sendTelegramMessage(botToken, chatId, text).catch(() => {});
}

module.exports = { sendTelegramMessage, sendTelegramPhoto, sendAdminNotification };
