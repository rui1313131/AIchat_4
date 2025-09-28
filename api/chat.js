// api/chat.js
module.exports = async (request, response) => {
  if (request.method !== 'POST') { return response.status(405).json({ error: 'Method Not Allowed' }); }
  const { message } = request.body;
  if (!message) { return response.status(400).json({ error: 'Message is required' }); }
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) { return response.status(500).json({ error: 'API key is not configured' }); }
  try {
    const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: message }],
        model: "llama-3.1-8b-instant", // ← 新しいモデル名に更新！
      }),
    });
    if (!groqResponse.ok) {
        const errorData = await groqResponse.json();
        return response.status(groqResponse.status).json({ error: 'AI APIからの応答に失敗しました。' });
    }
    const data = await groqResponse.json();
    const reply = data.choices[0]?.message?.content || "応答がありませんでした。";
    response.status(200).json({ reply: reply });
  } catch (error) {
    response.status(500).json({ error: 'Internal Server Error' });
  }
};