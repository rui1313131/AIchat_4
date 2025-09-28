// script.js
document.addEventListener('DOMContentLoaded', () => {
    
    // --- 変数定義 ---
    const canvas = document.getElementById("live2d-canvas");
    const app = new PIXI.Application({ view: canvas, autoStart: true, resizeTo: canvas.parentElement, backgroundColor: 0x333333 });
    const MODEL_PATH = "Mao/mao_pro.model3.json";
    let model = null; // モデルオブジェクトをグローバルに保持
    let lipSyncInterval = null; // 口パクアニメーションのID

    // チャット関連のDOM要素
    const chatForm = document.getElementById('chat-form');
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');
    const micButton = document.getElementById('mic-button');
    const chatLog = document.getElementById('chat-log');

    // --- Live2Dモデルの初期化 ---
    PIXI.live2d.Live2DModel.from(MODEL_PATH).then(m => {
        model = m; // 読み込んだモデルを保存
        app.stage.addChild(model);
        const scale = canvas.parentElement.offsetHeight / model.height * 0.9;
        model.scale.set(scale);
        model.x = (canvas.parentElement.offsetWidth - model.width) / 2;
        model.y = (canvas.parentElement.offsetHeight - model.height) / 2;
    }).catch(err => { console.error("Failed to load Live2D model:", err); });

    // --- リップシンク（口パク）機能 ---
    function startLipSync() {
        if (!model) return;
        // 100ミリ秒ごとに口をランダムに開閉させる
        lipSyncInterval = setInterval(() => {
            const value = Math.random();
            model.internalModel.coreModel.setParameterValueById('ParamMouthOpenY', value);
        }, 100);
    }

    function stopLipSync() {
        if (lipSyncInterval) {
            clearInterval(lipSyncInterval);
            lipSyncInterval = null;
        }
        if (model) {
            // 口を閉じる
            model.internalModel.coreModel.setParameterValueById('ParamMouthOpenY', 0);
        }
    }

    // --- チャット機能 ---
    function addMessage(role, content) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${role}`;
        const p = document.createElement('p');
        p.textContent = content;
        messageDiv.appendChild(p);
        chatLog.appendChild(messageDiv);
        chatLog.scrollTop = chatLog.scrollHeight;
    }

    addMessage('ai', 'こんにちは！メッセージをどうぞ。マイクボタンから話しかけることもできます。');

    // テキスト送信の関数
    async function submitMessage(message) {
        if (!message.trim()) return;
        addMessage('user', message);
        userInput.value = '';
        sendButton.disabled = true;
        micButton.disabled = true;
        sendButton.textContent = '送信中...';

        try {
            const response = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: message }) });
            const data = await response.json();
            if (!response.ok) { throw new Error(data.error || '不明なエラー'); }
            
            // AIの返信を音声で出力
            speak(data.reply);
            addMessage('ai', data.reply);

        } catch (error) {
            addMessage('ai', `エラー: ${error.message}`);
        } finally {
            sendButton.disabled = false;
            micButton.disabled = false;
            sendButton.textContent = '送信';
        }
    }
    
    chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        submitMessage(userInput.value);
    });

    // --- 音声合成 (Text-to-Speech) 機能 ---
    function speak(text) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'ja-JP'; // 日本語に設定
        
        // 発話が始まったらリップシンクを開始
        utterance.onstart = () => {
            startLipSync();
        };

        // 発話が終わったらリップシンクを停止
        utterance.onend = () => {
            stopLipSync();
        };
        
        speechSynthesis.speak(utterance);
    }
    
    // --- 音声認識 (Speech-to-Text) 機能 ---
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.lang = 'ja-JP';
        recognition.interimResults = false;

        micButton.addEventListener('click', () => {
            micButton.textContent = '…';
            micButton.disabled = true;
            recognition.start();
        });

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            userInput.value = transcript; // 認識したテキストを入力欄に入れる
            submitMessage(transcript); // そのまま送信する
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            addMessage('ai', '音声の認識に失敗しました。');
            micButton.disabled = false;
            micButton.textContent = '🎤';
        };

        recognition.onend = () => {
            micButton.disabled = false;
            micButton.textContent = '🎤';
        };

    } else {
        // ブラウザが音声認識に非対応の場合
        micButton.style.display = 'none';
        addMessage('ai', 'お使いのブラウザは音声入力に非対応です。');
    }
});