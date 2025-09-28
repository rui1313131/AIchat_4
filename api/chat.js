// api/chat.js

// Vercelがこのファイルを見つけると、自動的に安全なAPIエンドポイントを作成してくれます。
// 外部ライブラリは不要です。
module.exports = async (request, response) => {
  // POST以外のリクエストは拒否
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method Not Allowed' });
  }

  // フロントエンドから送られてきたメッセージを取得
  const { message } = request.body;

  if (!message) {
    return response.status(400).json({ error: 'Message is required' });
  }

  // Vercelに保存した秘密のAPIキーを読み込む
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    return response.status(500).json({ error: 'API key is not configured' });
  }

  try {
    // VercelサーバーがGroqに問い合わせる
    const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messages: [{
          role: "user",
          content: message,
        }],
        model: "llama3-70b-8192", // 高性能モデルを指定
      }),
    });

    if (!groqResponse.ok) {
        const errorData = await groqResponse.json();
        console.error("Groq API Error:", errorData);
        // エラー内容をフロントに返す
        return response.status(groqResponse.status).json({ error: 'AI APIからの応答に失敗しました。' });
    }

    const data = await groqResponse.json();
    const reply = data.choices[0]?.message?.content || "AIからの応答がありませんでした。";

    // フロントエンドにAIの返答を返す
    response.status(200).json({ reply: reply });

  } catch (error) {
    console.error("Internal Server Error:", error);
    response.status(500).json({ error: 'Internal Server Error' });
  }
};