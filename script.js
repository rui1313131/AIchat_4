// script.js
document.addEventListener('DOMContentLoaded', () => {
    
    const canvas = document.getElementById("live2d-canvas");
    const app = new PIXI.Application({ view: canvas, autoStart: true, resizeTo: canvas.parentElement, backgroundColor: 0x333333 });
    const MODEL_PATH = "Mao/mao_pro.model3.json";
    let model = null;
    let lipSyncInterval = null;

    const chatForm = document.getElementById('chat-form');
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');
    const micButton = document.getElementById('mic-button');
    const chatLog = document.getElementById('chat-log');

    PIXI.live2d.Live2DModel.from(MODEL_PATH).then(m => {
        model = m;
        app.stage.addChild(model);
        const scale = canvas.parentElement.offsetHeight / model.height * 0.9;
        model.scale.set(scale);
        model.x = (canvas.parentElement.offsetWidth - model.width) / 2;
        model.y = (canvas.parentElement.offsetHeight - model.height) / 2;
        model.interactive = true;
        
        // --- クリック時の処理をあなたのモデルに合わせて修正 ---
        model.on('pointerdown', (event) => {
            const point = event.data.global;
            // 体の部分がクリックされたか判定
            if (model.hitTest(point.x, point.y).includes('HitAreaBody')) {
                
                // 「笑顔」の表情をセット（exp_01が笑顔でない場合は、他の名前に変更してください）
                setExpression('exp_01'); 

                // 頬を赤らめる
                model.internalModel.coreModel.setParameterValueById('ParamCheek', 1);

                // あなたのモデルの「Idle」グループからランダムなモーションを再生
                model.motion('Idle', Math.floor(Math.random() * model.internalModel.motionManager.motionGroups.Idle.length));

                // 3秒後に表情と頬染めを元に戻す
                setTimeout(() => {
                    model.expression(); // 表情をデフォルトに戻す
                    model.internalModel.coreModel.setParameterValueById('ParamCheek', 0);
                }, 3000);
            }
        });

    }).catch(err => { console.error("Failed to load Live2D model:", err); });

    function startLipSync() {
        if (!model) return;
        lipSyncInterval = setInterval(() => {
            const value = Math.random();
            model.internalModel.coreModel.setParameterValueById('ParamMouthOpenY', value);
        }, 100);
    }

    function stopLipSync() {
        if (lipSyncInterval) { clearInterval(lipSyncInterval); }
        if (model) { model.internalModel.coreModel.setParameterValueById('ParamMouthOpenY', 0); }
    }
    
    function setExpression(name) {
        if (model) { model.expression(name); }
    }

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
            
            // AIの返答に応じて表情を変える
            if (data.reply.includes('ありがとう') || data.reply.includes('嬉しい')) {
                setExpression('exp_02'); // 「喜び」の表情名に書き換えてください
            } else if (data.reply.includes('ごめん') || data.reply.includes('残念')) {
                setExpression('exp_03'); // 「悲しみ」の表情名に書き換えてください
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
    
    chatForm.addEventListener('submit', (e) => { e.preventDefault(); submitMessage(userInput.value); });

    function speak(text) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'ja-JP';
        utterance.onstart = startLipSync;
        utterance.onend = () => {
            stopLipSync();
            model.expression(); // 会話が終わったらデフォルトの表情に戻す
        };
        speechSynthesis.speak(utterance);
    }
    
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
        recognition.onerror = (event) => { addMessage('ai', '音声の認識に失敗しました。'); micButton.disabled = false; micButton.textContent = '🎤'; };
        recognition.onend = () => { micButton.disabled = false; micButton.textContent = '🎤'; };
    } else {
        micButton.style.display = 'none';
    }
});