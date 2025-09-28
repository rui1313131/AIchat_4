// pages/index.js

import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import Script from 'next/script';

export default function Home() {
  const [messages, setMessages] = useState([{ role: 'ai', content: 'AIとのチャットを開始できます。' }]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatLogRef = useRef(null);

  // チャットログが更新されたら一番下までスクロールする
  useEffect(() => {
    if (chatLogRef.current) {
      chatLogRef.current.scrollTop = chatLogRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // 自作のバックエンドAPI (/api/chat) を呼び出す
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'APIからの応答エラー');
      }

      const aiMessage = { role: 'ai', content: data.reply };
      setMessages(prev => [...prev, aiMessage]);

    } catch (error) {
      const errorMessage = { role: 'ai', content: `エラー: ${error.message}` };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>AI Character Chat</title>
        <link rel="stylesheet" href="/style.css" />
      </Head>

      {/* Live2DモデルのSDKを読み込む */}
      <Script src="https://cubism.live2d.com/sdk-web/cubismcore/live2dcubismcore.min.js" strategy="beforeInteractive" />
      <Script src="https://cdn.jsdelivr.net/npm/pixi.js@7/dist/pixi.min.js" strategy="beforeInteractive" />
      <Script src="https://cdn.jsdelivr.net/npm/live2d-cubism-sdk-for-web@5-r1/dist/cubism4.min.js" strategy="beforeInteractive" />
      <Script src="https://cdn.jsdelivr.net/npm/live2d-cubism-pixi-renderer@1.1.2/dist/index.min.js" strategy="beforeInteractive" />
      
      {/* 自分のモデルを読み込むスクリプト */}
      <Script src="/script.js" strategy="lazyOnload" />

      <div className="container">
        {/* 左側：モデル表示エリア */}
        <div className="model-container">
          <canvas id="canvas" />
        </div>

        {/* 右側：チャットエリア */}
        <div className="chat-container">
          <div className="chat-log" ref={chatLogRef}>
            {messages.map((msg, index) => (
              <div key={index} className={`chat-message ${msg.role}`}>
                <p>{msg.content}</p>
              </div>
            ))}
          </div>
          <form onSubmit={handleSubmit} className="chat-form">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="ここにメッセージを入力..."
              disabled={isLoading}
            />
            <button type="submit" disabled={isLoading}>
              {isLoading ? '送信中...' : '送信'}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}