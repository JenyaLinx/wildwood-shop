const escapeHtml = (value = "") =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ success: false, error: "Method Not Allowed" }),
    };
  }

  try {
    const { name, phone, email, comment, items, total } = JSON.parse(event.body || "{}");

    if (!name || !phone || !email || !Array.isArray(items) || items.length === 0) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ success: false, error: "Missing order information" }),
      };
    }

    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!token || !chatId) {
      throw new Error("Telegram environment variables are not configured");
    }

    const orderList = items
      .map((item) => {
        const title = escapeHtml(item.title);
        const quantity = Number(item.quantity) || 0;
        const price = Number(item.price) || 0;
        return `• ${title} × ${quantity} — £${(price * quantity).toFixed(2)}`;
      })
      .join("\n");

    const safeTotal = Number(total) || 0;

    const message = `🌿 <b>NEW WILDWOOD ORDER</b>\n\n👤 <b>Name:</b> ${escapeHtml(name)}\n📞 <b>Phone:</b> ${escapeHtml(phone)}\n📧 <b>Email:</b> ${escapeHtml(email)}\n\n🛍 <b>ORDER</b>\n\n${orderList}\n\n💷 <b>Total:</b> £${safeTotal.toFixed(2)}\n\n💬 <b>Comment</b>\n${escapeHtml(comment || "—")}`;

    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: "HTML" }),
    });

    const data = await response.json();
    if (!data.ok) throw new Error(data.description || "Telegram request failed");

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ success: true }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ success: false, error: error.message }),
    };
  }
};
