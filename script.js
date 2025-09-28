// script.js
document.addEventListener('DOMContentLoaded', () => {
    
    // --- 変数定義 ---
    const canvas = document.getElementById("live2d-canvas");
    const app = new PIXI.Application({ view: canvas, autoStart: true, resizeTo: canvas.parentElement, backgroundColor: 0x333333 });
    const MODEL_PATH = "Mao/mao_pro.model3.json";
    let model = null;
    let lipSyncInterval = null;

    // チャット関連のDOM要素
    const chatForm = document.getElementById('chat-form');
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');
    const micButton = document.getElementById('mic-button');
    const chatLog = document.getElementById('chat-log');

    // --- Live2Dモデルの初期化 ---
    PIXI.live2d.Live2DModel.from(MODEL_PATH).then(m => {
        model = m;
        app.stage.addChild(model);
        const scale = canvas.parentElement.offsetHeight / model.height * 0.9;
        model.scale.set(scale);
        model.x = (canvas.parentElement.offsetWidth - model.width) / 2;
        model.y = (canvas.parentElement.offsetHeight - model.height) / 2;

        // NEW: モデルのインタラクションを有効化
        model.interactive = true;
        
        // NEW: モデルをクリックした時の処理
        model.on('pointerdown', (event) => {
            const point = event.data.global;
            // ヒットテスト（体のどの部分がクリックされたか判定）
            if (model.hitTest(point.x, point.y).includes('HitAreaBody')) {
                // 体がクリックされたら、ランダムなTapBodyモーションを再生
                model.motion('TapBody', Math.floor(Math.random() * model.internalModel.motionManager.motionGroups.TapBody.length));
            }
        });

    }).catch(err => { console.error("Failed to load Live2D model:", err); });

    // --- リップシンク（口パク）機能 ---
    function startLipSync() {
        if (!model) return;
        lipSyncInterval = setInterval(() => {
            const value = Math.random();
            model.internalModel.coreModel.setParameterValueById('ParamMouthOpenY', value);
        }, 100);
    }

    function stopLipSync() {
        if (lipSyncInterval) { clearInterval(lipSyncInterval); lipSyncInterval = null; }
        if (model) { model.internalModel.coreModel.setParameterValueById('ParamMouthOpenY', 0); }
    }
    
    // NEW: 表情を変更する関数
    function setExpression(name) {
        if (model && model.internalModel.motionManager.expressionManager) {
            model.expression(name);
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

    addMessage('ai', 'こんにちは！私に話しかけたり、クリックしてみてください。');

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
            
            // NEW: AIの返答に応じて表情を変える（例）
            if (data.reply.includes('ありがとう') || data.reply.includes('嬉しい')) {
                setExpression('f01'); // あなたのモデルの「喜び」の表情名に書き換えてください
            } else if (data.reply.includes('ごめん') || data.reply.includes('残念')) {
                setExpression('f03'); // あなたのモデルの「悲しみ」の表情名に書き換えてください
            }

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
        utterance.lang = 'ja-JP';
        utterance.onstart = startLipSync;
        utterance.onend = () => {
            stopLipSync();
            setExpression('f02'); // 会話が終わったらデフォルトの表情に戻すなど
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
            userInput.value = transcript;
            submitMessage(transcript);
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
        micButton.style.display = 'none';
        addMessage('ai', 'お使いのブラウザは音声入力に非対応です。');
    }
});