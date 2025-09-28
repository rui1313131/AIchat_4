// script.js

document.addEventListener('DOMContentLoaded', () => {
    
    // --- Live2Dモデルの初期化 ---
    const canvas = document.getElementById("live2d-canvas");
    if (!canvas) {
        console.error("Canvas element #live2d-canvas not found!");
        return;
    }

    const app = new PIXI.Application({
        view: canvas,
        autoStart: true,
        resizeTo: canvas.parentElement,
        backgroundColor: 0x333333,
    });

    // あなたのモデルへのパス (要確認・修正)
    const MODEL_PATH = "Mao/mao_pro_en/mao_pro.model3.json"; 

    PIXI.live2d.Live2DModel.from(MODEL_PATH).then(model => {
        app.stage.addChild(model);
        // モデルのサイズと位置を調整
        const scale = canvas.parentElement.offsetHeight / model.height * 0.9;
        model.scale.set(scale);
        model.x = (canvas.parentElement.offsetWidth - model.width) / 2;
        model.y = (canvas.parentElement.offsetHeight - model.height) / 2;
    }).catch(err => {
        console.error("Failed to load Live2D model:", err);
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "white";
        ctx.font = "16px sans-serif";
        ctx.fillText("モデルの読み込みに失敗しました。", 20, 40);
    });


    // --- チャット機能の初期化 ---
    const chatForm = document.getElementById('chat-form');
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');
    const chatLog = document.getElementById('chat-log');

    // チャット履歴にメッセージを追加する関数
    function addMessage(role, content) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${role}`;
        
        const p = document.createElement('p');
        p.textContent = content;
        
        messageDiv.appendChild(p);
        chatLog.appendChild(messageDiv);
        
        // 自動で一番下までスクロール
        chatLog.scrollTop = chatLog.scrollHeight;
    }

    // 最初にAIからの挨拶を追加
    addMessage('ai', 'こんにちは！メッセージをどうぞ。');

    // フォームが送信されたときの処理
    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault(); // ページの再読み込みを防ぐ
        const message = userInput.value.trim();
        if (!message) return;

        // ユーザーのメッセージを表示
        addMessage('user', message);
        userInput.value = ''; // 入力欄をクリア

        // ボタンを無効化してローディング状態にする
        sendButton.disabled = true;
        sendButton.textContent = '送信中...';

        try {
            // VercelのサーバーレスAPI(/api/chat)にリクエストを送信
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ message: message }),
            });
            
            const data = await response.json();

            if (!response.ok) {
                // APIからエラーが返ってきた場合
                throw new Error(data.error || '不明なエラーが発生しました。');
            }

            // AIの返信を表示
            addMessage('ai', data.reply);

        } catch (error) {
            // 通信エラーなどが発生した場合
            console.error('Fetch Error:', error);
            addMessage('ai', `エラーが発生しました: ${error.message}`);
        } finally {
            // ボタンを再度有効化
            sendButton.disabled = false;
            sendButton.textContent = '送信';
        }
    });
});