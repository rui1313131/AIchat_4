document.addEventListener('DOMContentLoaded', () => {
    // 各要素を取得
    const canvas = document.getElementById('live2d-canvas');
    const sendButton = document.getElementById('send-button');
    const userInput = document.getElementById('user-input');
    const chatHistory = document.getElementById('chat-history');
    
    // Live2Dモデルのパス
    const MODEL_PATH = './Mao/mao_pro.model3.json';
    
    // --- アプリケーションの初期化を開始 ---
    async function initializeApp() {
        const app = new PIXI.Application({
            view: canvas,
            autoStart: true,
            resizeTo: canvas.parentElement,
            backgroundColor: 0x333333,
            transparent: true
        });

        async function loadLive2DModel() {
            try {
                const model = await PIXI.live2d.Live2DModel.from(MODEL_PATH);
                app.stage.addChild(model);
                const scale = canvas.parentElement.offsetHeight / model.height * 0.9;
                model.scale.set(scale);
                model.x = (canvas.parentElement.offsetWidth - model.width) / 2;
                model.y = (canvas.parentElement.offsetHeight - model.height) / 2;
                model.motion('Idle');
                model.on('hit', (hitAreaNames) => {
                    if (hitAreaNames.includes('Body')) {
                        model.motion('TapBody', undefined, 3);
                    }
                });
            } catch (error) {
                console.error("Live2Dモデルの読み込みに失敗しました:", error);
                alert(`Live2Dモデルの読み込みに失敗しました。\nエラー: ${error.message}`);
            }
        }

        // Live2Dモデルを読み込む
        loadLive2DModel();
        
        appendMessage("AIとのチャットを開始できます。", "ai");
    }

    initializeApp();

    // メッセージ送受信の処理
    sendButton.addEventListener('click', handleSendMessage);
    userInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') { handleSendMessage(); }
    });

    async function handleSendMessage() {
        const message = userInput.value.trim();
        if (!message) return;

        // ユーザーのメッセージをUIに追加し、入力欄をクリア
        appendMessage(message, 'user');
        userInput.value = '';
        sendButton.disabled = true; // 連打防止

        try {
            const aiResponse = await sendMessageToAI(message);
            appendMessage(aiResponse, 'ai');
        } catch (error) {
            appendMessage('AIからの応答取得中にエラーが発生しました。', 'ai');
        } finally {
            sendButton.disabled = false; // 送信ボタンを再度有効化
        }
    }

    // AIとの通信部分をVercelのバックエンドAPIを呼び出すように変更
    async function sendMessageToAI(message) {
        try {
            // Vercelに作成したバックエンドAPIにリクエストを送る
            const response = await fetch("/api/chat", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    message: message // ユーザーのメッセージだけを送る
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error("API Error:", errorData);
                throw new Error(`API request failed with status ${response.status}`);
            }

            const data = await response.json();
            return data.reply; // バックエンドからの返答を受け取る
        } catch (error) {
            console.error("sendMessageToAI Error:", error);
            return "AIからの応答取得中にエラーが発生しました。";
        }
    }

    function appendMessage(text, sender) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message', sender);
        messageElement.innerText = text;
        chatHistory.appendChild(messageElement);
        chatHistory.scrollTop = chatHistory.scrollHeight;
    }
});