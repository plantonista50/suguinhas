document.addEventListener('DOMContentLoaded', () => {
    
    // --- ESTADO DA APLICAÇÃO ---
    let currentTool = 'prontuario'; // Padrão inicial
    let selectedFile = null;

    // --- MAPA DE FERRAMENTAS E WEBHOOKS ---
    const TOOLS = {
        prontuario: {
            title: "SuGa PRONTUÁRIO",
            webhook: "https://n8n-n8n-start.zvu2si.easypanel.host/webhook/cfadce39-4d13-4a1e-ac7d-24ed345a5e9c",
            placeholder: "Digite a transcrição do áudio ou anexe um arquivo..."
        },
        examinator: {
            title: "SuGa EXAMINATOR",
            webhook: "https://n8n-n8n-start.zvu2si.easypanel.host/webhook/processar-exame",
            placeholder: "Anexe o exame (PDF/Imagem) para análise..."
        },
        brainstorm: {
            title: "SuGa BRAINSTORM",
            webhook: "https://n8n-n8n-start.zvu2si.easypanel.host/webhook/suga-brainstorm",
            placeholder: "Descreva o caso clínico (Ex: Homem, 54 anos, dor torácica...)"
        }
    };

    // --- ELEMENTOS DO DOM ---
    const sidebar = document.getElementById('sidebar');
    const menuToggle = document.getElementById('menu-toggle');
    const mainTitle = document.getElementById('main-title');
    const navItems = document.querySelectorAll('.nav-item[data-tool]');
    const btnNewChat = document.getElementById('btn-new-chat');
    
    const chatHistory = document.getElementById('chat-history');
    const welcomeScreen = document.getElementById('welcome-screen');
    
    const chatInput = document.getElementById('chat-input');
    const btnSend = document.getElementById('btn-send');
    const btnAttachment = document.getElementById('btn-attachment');
    const hiddenFileInput = document.getElementById('hidden-file-input');
    
    const filePreviewArea = document.getElementById('file-preview-area');
    const previewFilename = document.getElementById('preview-filename');
    const removeFileBtn = document.getElementById('remove-file-btn');

    // --- 1. LÓGICA DA SIDEBAR E NAVEGAÇÃO ---
    
    // Toggle Sidebar
    if(menuToggle) {
        menuToggle.addEventListener('click', () => {
            if (window.innerWidth <= 768) {
                sidebar.classList.toggle('mobile-open');
            } else {
                sidebar.classList.toggle('collapsed');
            }
        });
    }

    // Seleção de Ferramenta
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const toolId = item.getAttribute('data-tool');
            setActiveTool(toolId);
            // Em mobile, fecha a sidebar ao clicar
            if (window.innerWidth <= 768) sidebar.classList.remove('mobile-open');
        });
    });

    // Nova Conversa (Limpa tela)
    if(btnNewChat) {
        btnNewChat.addEventListener('click', () => {
            clearChat();
        });
    }

    function setActiveTool(toolId) {
        // Atualiza UI da Sidebar
        navItems.forEach(nav => nav.classList.remove('active'));
        const activeNav = document.querySelector(`.nav-item[data-tool="${toolId}"]`);
        if(activeNav) activeNav.classList.add('active');

        // Atualiza Estado
        currentTool = toolId;
        const toolData = TOOLS[toolId];

        // Atualiza Título e Placeholder
        mainTitle.textContent = toolData.title;
        chatInput.placeholder = toolData.placeholder;

        // Limpa chat (Opcional: Pode manter histórico se preferir)
        clearChat();
    }

    function clearChat() {
        // Remove todas as mensagens, exceto a Welcome Screen
        const messages = chatHistory.querySelectorAll('.message-wrapper');
        messages.forEach(msg => msg.remove());
        welcomeScreen.style.display = 'block';
        resetFileInput();
        chatInput.value = '';
        adjustTextareaHeight(chatInput);
    }

    // --- 2. LÓGICA DE INPUT DE ARQUIVO ---

    // Clique no ícone (+)
    btnAttachment.addEventListener('click', () => {
        hiddenFileInput.click();
    });

    // Arquivo selecionado
    hiddenFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            selectedFile = file;
            showFilePreview(file.name);
        }
    });

    // Remover arquivo
    removeFileBtn.addEventListener('click', () => {
        resetFileInput();
    });

    function resetFileInput() {
        selectedFile = null;
        hiddenFileInput.value = '';
        filePreviewArea.style.display = 'none';
    }

    function showFilePreview(name) {
        previewFilename.textContent = name;
        filePreviewArea.style.display = 'flex';
    }

    // Ajuste altura textarea
    chatInput.addEventListener('input', function() {
        adjustTextareaHeight(this);
    });

    function adjustTextareaHeight(el) {
        el.style.height = 'auto';
        el.style.height = (el.scrollHeight) + 'px';
        if(el.value === '') el.style.height = 'auto';
    }

    // --- 3. LÓGICA DE ENVIO (MENSAGEM) ---

    // Enviar com Enter (sem Shift)
    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    });

    btnSend.addEventListener('click', handleSend);

    async function handleSend() {
        const text = chatInput.value.trim();
        const file = selectedFile;

        if (!text && !file) return;

        // Esconde Welcome Screen na primeira mensagem
        welcomeScreen.style.display = 'none';

        // 1. Adiciona Mensagem do Usuário na Tela
        addUserMessage(text, file ? file.name : null);

        // Limpa Inputs UI
        chatInput.value = '';
        chatInput.style.height = 'auto';
        resetFileInput();
        
        // 2. Mostra Loading da IA
        const loadingId = addLoadingMessage();
        scrollToBottom();

        // 3. Prepara Envio para o n8n
        const toolData = TOOLS[currentTool];
        const formData = new FormData();

        if (file) formData.append('file', file);
        if (text) formData.append('textoBruto', text);

        try {
            const response = await fetch(toolData.webhook, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) throw new Error(`Erro na API: ${response.statusText}`);

            const data = await response.json();
            // Pega o resultado (suporta diferentes formatos que configuramos antes)
            const aiResponse = data.resumoCompleto || data.text || JSON.stringify(data);

            // 4. Remove Loading e Mostra Resposta
            removeMessage(loadingId);
            addAiMessage(aiResponse);

        } catch (error) {
            console.error(error);
            removeMessage(loadingId);
            let errorMsg = "Ocorreu um erro ao processar sua solicitação.";
            if (error.name === 'SyntaxError') errorMsg = "A resposta do servidor demorou muito. Tente um arquivo menor ou texto mais curto.";
            addAiMessage(errorMsg);
        }
        
        scrollToBottom();
    }

    // --- 4. FUNÇÕES DE RENDERIZAÇÃO DE MENSAGENS ---

    function addUserMessage(text, fileName) {
        const wrapper = document.createElement('div');
        wrapper.classList.add('message-wrapper', 'user');
        
        let contentHtml = '';
        if (fileName) {
            contentHtml += `<div style="display:flex; align-items:center; gap:5px; margin-bottom:5px; color:#a8c7fa; font-size:0.9rem;">
                <span class="material-symbols-outlined" style="font-size:1.1rem;">description</span> ${fileName}
            </div>`;
        }
        if (text) {
            contentHtml += `<div>${text.replace(/\n/g, '<br>')}</div>`;
        }

        wrapper.innerHTML = `
            <div class="message-content">
                ${contentHtml}
            </div>
            <div class="avatar-icon user">VC</div>
        `;
        chatHistory.appendChild(wrapper);
    }

    function addAiMessage(text) {
        const wrapper = document.createElement('div');
        wrapper.classList.add('message-wrapper', 'ai');
        
        // Formatação simples do texto (negrito e quebras)
        // Para ficar "bonito" como no exemplo, usamos <pre> com wrap
        wrapper.innerHTML = `
            <div class="avatar-icon ai">
                <span class="material-symbols-outlined" style="font-size:1.2rem;">smart_toy</span>
            </div>
            <div class="message-content">
                <pre>${text}</pre>
                <div style="margin-top:10px; display:flex; gap:10px;">
                    <span class="material-symbols-outlined" style="cursor:pointer; font-size:1.2rem; color:#666;" onclick="copyText(this)">content_copy</span>
                </div>
            </div>
        `;
        chatHistory.appendChild(wrapper);
    }

    function addLoadingMessage() {
        const id = 'loading-' + Date.now();
        const wrapper = document.createElement('div');
        wrapper.classList.add('message-wrapper', 'ai');
        wrapper.id = id;
        wrapper.innerHTML = `
            <div class="avatar-icon ai">
                <span class="material-symbols-outlined" style="font-size:1.2rem;">smart_toy</span>
            </div>
            <div class="message-content">
                <div class="typing-indicator">
                    <span></span><span></span><span></span>
                </div>
            </div>
        `;
        chatHistory.appendChild(wrapper);
        return id;
    }

    function removeMessage(id) {
        const el = document.getElementById(id);
        if (el) el.remove();
    }

    function scrollToBottom() {
        chatHistory.scrollTop = chatHistory.scrollHeight;
    }

    // Função global para copiar texto da mensagem
    window.copyText = function(btn) {
        const pre = btn.closest('.message-content').querySelector('pre');
        navigator.clipboard.writeText(pre.textContent).then(() => {
            btn.style.color = '#4caf50'; // Verde feedback
            setTimeout(() => { btn.style.color = '#666'; }, 2000);
        });
    };

});