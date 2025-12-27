document.addEventListener('DOMContentLoaded', () => {
    
    console.log("🚀 SCRIPT INICIADO: MODO PRODUÇÃO (Nuclear Edition)");

    // ============================================================
    // ⚙️ CONFIGURAÇÕES GERAIS (EDITE AQUI)
    // ============================================================
    
    // 👇 URL DE PRODUÇÃO CORRIGIDA (Apenas o domínio base)
    const BASE_N8N_URL = "https://n8n-n8n.zvu2si.easypanel.host";

    // URLs DOS ENDPOINTS (Geradas automaticamente)
    const AUTH_WEBHOOK = `${BASE_N8N_URL}/webhook/suga-auth`;
    const CHAT_WEBHOOK = `${BASE_N8N_URL}/webhook/suga-chat-secure`;

    // FERRAMENTAS
    const TOOLS = {
        prontuario: { 
            title: "SuGa PRONTUÁRIO", 
            // ID original do seu fluxo de prontuário
            webhook: `${BASE_N8N_URL}/webhook/cfadce39-4d13-4a1e-ac7d-24ed345a5e9c`, 
            placeholder: "Digite ou anexe áudio/texto para o prontuário...",
            mode: "processamento" 
        },
        examinator: { 
            title: "SuGa EXAMINATOR", 
            // Slug definido no fluxo Examintator
            webhook: `${BASE_N8N_URL}/webhook/processar-exame`, 
            placeholder: "Anexe exames (PDF/Imagem) para análise...",
            mode: "processamento"
        }
    };

    // --- ESTADO ---
    let currentTool = 'prontuario'; 
    let selectedFiles = []; 
    let currentUser = null; 
    let currentSessionId = null;  
    let currentContextText = null;

    // INDICADOR VISUAL (Produção - Verde)
    const badge = document.createElement('div');
    badge.innerHTML = "✅ AMBIENTE SEGURO (PROD)";
    badge.style.cssText = "position:fixed; top:0; left:50%; transform:translateX(-50%); background:#2e7d32; color:white; font-size:10px; padding:2px 10px; z-index:9999; border-radius:0 0 8px 8px; font-weight:600; box-shadow:0 2px 10px rgba(0,0,0,0.2); letter-spacing: 0.5px;";
    document.body.appendChild(badge);

    // ============================================================
    // 1. UTILITÁRIOS
    // ============================================================
    const loginScreen = document.getElementById('login-screen');
    const loginForm = document.getElementById('login-form');
    const userInitialsDisplay = document.getElementById('user-initials');

    function generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    // ============================================================
    // 2. LOGIN (ROBUSTO)
    // ============================================================
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            console.log("👉 Botão Login Clicado");

            const emailInput = document.getElementById('email');
            const passInput = document.getElementById('password');
            const btn = loginForm.querySelector('button');
            const originalText = btn.textContent;

            const email = emailInput.value;
            const password = passInput.value;

            btn.textContent = "Validando Credenciais..."; 
            btn.disabled = true;

            try {
                const response = await fetch(AUTH_WEBHOOK, {
                    method: 'POST', 
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'login', email, password })
                });
                
                let data = await response.json();
                if (Array.isArray(data)) data = data[0]; 

                if (data && data.access_token) {
                    currentUser = { 
                        email: data.user.email, 
                        token: data.access_token,
                        id: data.user.id 
                    };
                    
                    if(userInitialsDisplay) {
                        userInitialsDisplay.textContent = "MD";
                        userInitialsDisplay.style.backgroundColor = '#4caf50';
                    }
                    
                    loginScreen.style.opacity = '0';
                    setTimeout(() => { loginScreen.style.display = 'none'; }, 500);
                } else {
                    alert("Acesso Negado: " + (data.msg || data.message || "Verifique e-mail e senha."));
                }
            } catch (err) { 
                console.error(err);
                alert("Erro de conexão com o servidor de autenticação.");
            }
            btn.textContent = originalText; 
            btn.disabled = false;
        });
    }

    // ============================================================
    // 3. LÓGICA DO CHAT E ANEXOS
    // ============================================================
    const chatHistory = document.getElementById('chat-history');
    const chatInput = document.getElementById('chat-input');
    const btnSend = document.getElementById('btn-send');
    const btnAttachment = document.getElementById('btn-attachment'); 
    const hiddenFileInput = document.getElementById('hidden-file-input'); 
    const fileListContainer = document.getElementById('file-list-container'); 
    const welcomeScreen = document.getElementById('welcome-screen');
    const navItems = document.querySelectorAll('.nav-item[data-tool]');
    const mainTitle = document.getElementById('main-title');

    // --- A. Troca de Ferramenta ---
    navItems.forEach(item => { 
        item.addEventListener('click', () => { 
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
            
            const toolId = item.getAttribute('data-tool');
            currentTool = toolId;
            
            if(mainTitle) mainTitle.textContent = TOOLS[toolId].title;
            if(chatInput) chatInput.placeholder = TOOLS[toolId].placeholder;
            
            clearChat();
        }); 
    });

    function clearChat() {
        if(!chatHistory) return;
        chatHistory.querySelectorAll('.message-wrapper').forEach(msg => msg.remove());
        if(welcomeScreen) welcomeScreen.style.display = 'block';
        if(chatInput) chatInput.value = ''; 
        resetFileInput(); 
        currentSessionId = null;
        currentContextText = null;
    }

    // --- B. Lógica de Anexos ---
    if (btnAttachment && hiddenFileInput) {
        btnAttachment.addEventListener('click', () => {
            hiddenFileInput.click();
        });

        hiddenFileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                selectedFiles = [...selectedFiles, ...Array.from(e.target.files)].slice(0, 10);
                renderFileList();
                hiddenFileInput.value = ''; 
            }
        });
    }

    function renderFileList() {
        if (!fileListContainer) return;
        
        fileListContainer.innerHTML = ''; 
        
        if (selectedFiles.length > 0) {
            fileListContainer.style.display = 'flex';
            
            selectedFiles.forEach((file, index) => {
                const chip = document.createElement('div'); 
                chip.className = 'file-chip';
                chip.innerHTML = `<span class="material-symbols-outlined" style="font-size:1.1rem">description</span> <span class="file-name">${file.name}</span> <span class="material-symbols-outlined remove-btn" style="cursor:pointer; margin-left:5px; font-size:1rem;">close</span>`;
                
                chip.querySelector('.remove-btn').addEventListener('click', (e) => {
                    e.stopPropagation(); 
                    selectedFiles.splice(index, 1); 
                    renderFileList(); 
                });
                
                fileListContainer.appendChild(chip);
            });
        } else {
            fileListContainer.style.display = 'none';
        }
    }

    function resetFileInput() { 
        selectedFiles = []; 
        renderFileList(); 
    }

    // --- C. Envio de Mensagem ---
    if (btnSend && chatInput) {
        const handleSend = async () => {
            const text = chatInput.value.trim();
            
            // Só envia se tiver texto OU arquivo
            if (!text && selectedFiles.length === 0) return;

            if(welcomeScreen) welcomeScreen.style.display = 'none';

            // 1. Renderiza msg do usuário
            const userDiv = document.createElement('div'); 
            userDiv.className = 'message-wrapper user';
            
            let htmlContent = '';
            if(selectedFiles.length > 0) {
                htmlContent += selectedFiles.map(f => `<div style="font-size:0.8rem;color:#a8c7fa;margin-bottom:4px">📎 ${f.name}</div>`).join('');
            }
            if(text) {
                htmlContent += `<div>${text.replace(/\n/g,'<br>')}</div>`;
            }

            userDiv.innerHTML = `<div class="message-content">${htmlContent}</div><div class="avatar-icon user">VC</div>`;
            chatHistory.appendChild(userDiv);

            // Limpa inputs
            chatInput.value = '';
            const filesToSend = [...selectedFiles]; 
            resetFileInput(); 

            // 2. Loader
            const ldId = 'ld-'+Date.now();
            const ldDiv = document.createElement('div'); 
            ldDiv.className = 'message-wrapper ai'; 
            ldDiv.id = ldId;
            ldDiv.innerHTML = `<div class="avatar-icon ai">🤖</div><div class="message-content">Processando...</div>`;
            chatHistory.appendChild(ldDiv);
            chatHistory.scrollTop = chatHistory.scrollHeight;

            // 3. Prepara Dados
            const formData = new FormData();
            const userEmail = currentUser ? currentUser.email : "anonimo@teste.com";
            const userId = currentUser ? currentUser.id : "anonimo_id";

            // Lógica de Decisão:
            const isProcessing = (filesToSend.length > 0) || !currentContextText;
            
            let targetUrl = isProcessing ? TOOLS[currentTool].webhook : CHAT_WEBHOOK;

            if (isProcessing) {
                currentSessionId = generateUUID(); // Nova sessão para novo exame
                // Anexa arquivos
                filesToSend.forEach((f, i) => {
                    formData.append(`file_${i}`, f); 
                    if(i===0) formData.append('file', f); // Fallback
                });
                
                if(text) formData.append('textoBruto', text);
                formData.append('user_email', userEmail);
                formData.append('session_id', currentSessionId);
            } else {
                formData.append('user_message', text);
                formData.append('session_id', currentSessionId);
                formData.append('user_id', userId);
                formData.append('context_text', currentContextText);
            }

            try {
                const res = await fetch(targetUrl, { method: 'POST', body: formData });
                const data = await res.json();
                
                let aiText = "";
                if (isProcessing) {
                    const rawText = data.resumoCompleto || data.text || data.message || "";
                    currentContextText = rawText; // Salva o contexto para o chat
                    aiText = rawText;
                } else {
                    aiText = data.reply || data.message || "Sem resposta.";
                }

                if (!aiText && data.length) aiText = JSON.stringify(data);
                if (!aiText) aiText = "Procedimento concluído, mas sem retorno de texto.";

                document.getElementById(ldId)?.remove();
                
                const aiDiv = document.createElement('div'); 
                aiDiv.className = 'message-wrapper ai';
                aiDiv.innerHTML = `<div class="avatar-icon ai">🤖</div><div class="message-content"><pre>${aiText}</pre></div>`;
                chatHistory.appendChild(aiDiv);

            } catch (e) {
                document.getElementById(ldId)?.remove();
                console.error(e);
                const errDiv = document.createElement('div'); 
                errDiv.className = 'message-wrapper ai';
                errDiv.innerHTML = `<div class="avatar-icon ai">⚠️</div><div class="message-content">Erro de Processamento: ${e.message}</div>`;
                chatHistory.appendChild(errDiv);
            }
            chatHistory.scrollTop = chatHistory.scrollHeight;
        };

        btnSend.addEventListener('click', handleSend);
        chatInput.addEventListener('keydown', (e) => {
            if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
        });
    }

    // ============================================================
    // 4. FECHAR MODAIS
    // ============================================================
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.modal-overlay').forEach(modal => modal.style.display = 'none');
        });
    });

});

