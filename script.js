// script.js
document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById("live2d-canvas");
    if (!canvas) { return; }
    const app = new PIXI.Application({ view: canvas, autoStart: true, resizeTo: canvas.parentElement, backgroundColor: 0x333333 });
    const MODEL_PATH = "Mao/mao_pro.model3.json"; // 修正済みのパス
    PIXI.live2d.Live2DModel.from(MODEL_PATH).then(model => {
        app.stage.addChild(model);
        const scale = canvas.parentElement.offsetHeight / model.height * 0.9;
        model.scale.set(scale);
        model.x = (canvas.parentElement.offsetWidth - model.width) / 2;
        model.y = (canvas.parentElement.offsetHeight - model.height) / 2;
    }).catch(err => { console.error("Failed to load Live2D model:", err); });
    const chatForm = document.getElementById('chat-form');
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');
    const chatLog = document.getElementById('chat-log');
    function addMessage(role, content) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${role}`;
        const p = document.createElement('p');
        p.textContent = content;
        messageDiv.appendChild(p);
        chatLog.appendChild(messageDiv);
        chatLog.scrollTop = chatLog.scrollHeight;
    }
    addMessage('ai', 'こんにちは！メッセージをどうぞ。');
    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const message = userInput.value.trim();
        if (!message) return;
        addMessage('user', message);
        userInput.value = '';
        sendButton.disabled = true;
        sendButton.textContent = '送信中...';
        try {
            const response = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: message }) });
            const data = await response.json();
            if (!response.ok) { throw new Error(data.error || '不明なエラー'); }
            addMessage('ai', data.reply);
        } catch (error) {
            addMessage('ai', `エラー: ${error.message}`);
        } finally {
            sendButton.disabled = false;
            sendButton.textContent = '送信';
        }
    });
});