// ============================================================
// CONSTANTS & STATE
// ============================================================
const ta = document.getElementById("txtMsg");
const chatBox = document.getElementById("chatBox");
const chatBody = document.getElementById("chatBody");
const chatIntro = document.getElementById("chatIntro");
const API_URL = "https://aiagent-9816974896.asia-southeast1.run.app";
const USER_ID = "default_user";
let thinkingEl = null;
let thinkingTimer = null;
let session_id = null;
let currentNotificationEl = null;

// ============================================================
// TEXTAREA AUTO RESIZE
// ============================================================
const MAX = 120;
function autoResize() {
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, MAX) + "px";
}
ta.addEventListener("input", autoResize);
autoResize();

// ============================================================
// ENTER SEND
// ============================================================
ta.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage("");
    }
});

// ============================================================
// UI HELPERS
// ============================================================
function botThinking(text) {
    if (thinkingEl) {
        const dots = thinkingEl.querySelector(".thinking-dots");
        if (dots) dots.innerHTML = "🚀 " + text;
        return;
    }
    thinkingEl = document.createElement("div");
    thinkingEl.className = "msg bot thinking";
    thinkingEl.innerHTML = `<span class="thinking-dots">🚀 ${text}</span>`;
    chatBox.appendChild(thinkingEl);
    scrollBottom();
}
function removeThinking() {
    if (thinkingEl) { thinkingEl.remove(); thinkingEl = null; }
    if (currentNotificationEl) { currentNotificationEl.remove(); currentNotificationEl = null; }
}
function bot(html) {
    chatBox.innerHTML += `<div class="msg bot">${html}</div>`;
    scrollBottom();
}
function botElement(el) {
    const wrapper = document.createElement("div");
    wrapper.className = "msg bot";
    wrapper.appendChild(el);
    chatBox.appendChild(wrapper);
    scrollBottom();
}
function user(msg) {
    chatBox.innerHTML += `<div class="msg"><div class="user">${escapeHtml(msg)}</div></div>`;
    scrollBottom();
}
function botError(msg) {
    chatBox.innerHTML += `<div class="msg bot" style="color:#b91c1c;background:#fee2e2">❌ ${msg}</div>`;
    scrollBottom();
}
function scrollBottom() { if (chatBody) chatBody.scrollTop = chatBody.scrollHeight; }
function escapeHtml(text) { const d = document.createElement("div"); d.innerText = text; return d.innerHTML; }

// Quick button click (recommendation chips)
document.addEventListener("click", e => {
    if (e.target.classList.contains("quick-btn")) {
        sendMessage(decodeURIComponent(e.target.dataset.msg));
    }
});

// ============================================================
// SESSION MANAGEMENT
// ============================================================
async function createSession() {
    try {
        const res = await fetch(`${API_URL}/sessions/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user_id: USER_ID })
        });
        const data = await res.json();
        if (data.status === "success" && data.data && data.data.session_id) {
            session_id = data.data.session_id;
            console.log("Session created:", session_id);
        }
    } catch (e) { console.error("Failed to create session:", e); }
}

async function fetchSessions() {
    try {
        const res = await fetch(`${API_URL}/sessions/${USER_ID}`);
        const data = await res.json();
        return Array.isArray(data) ? data : (data.status === "success" ? data.data : []);
    } catch (e) { console.error("Failed to fetch sessions:", e); return []; }
}

async function loadSession(sid) {
    if (sid === session_id) return;
    session_id = sid;
    chatBox.innerHTML = "";
    hideChatIntro();
    botThinking("Đang tải lịch sử...");
    try {
        const res = await fetch(`${API_URL}/sessions/${USER_ID}/${sid}?skip=0&limit=50`);
        const data = await res.json();
        const sessionData = data.status === "success" ? data.data : (Array.isArray(data) ? data : []);
        removeThinking();
        if (Array.isArray(sessionData) && sessionData.length > 0) {
            sessionData.forEach(item => renderHistoryItem(item));
        } else {
            bot("Chưa có tin nhắn nào trong cuộc trò chuyện này.");
        }
    } catch (e) { removeThinking(); botError("Không thể tải lịch sử."); }
}

function renderHistoryItem(item) {
    if (item.role === "user") { user(item.content || ""); return; }
    if (item.type === "table" && item.content) { renderTable(item.content); return; }
    if (item.type === "chart" && item.content) { renderChart(item.content); return; }
    if (item.type === "file" && item.content) { renderFile(item.content); return; }
    if (item.type === "final_response" || item.type === "text") {
        const text = extractResponseText(item.content);
        if (text) bot(formatResponseText(text));
    }
}

// ============================================================
// SEND MESSAGE
// ============================================================
async function sendMessage(ms) {
    if (!authToken) { showLogin(); return; }
    if (!session_id) {
        await createSession();
        if (!session_id) { botError("Không thể tạo phiên. Vui lòng thử lại."); return; }
    }
    if (ms === "") { const text = ta.value.trim(); if (!text) return; ms = text; }
    user(ms);
    ta.value = "";
    autoResize();
    await streamAIResponse(ms);
}

// ============================================================
// SSE STREAM PARSER (matches ChatWidget.tsx)
// ============================================================
async function streamAIResponse(prompt) {
    hideChatIntro();
    botThinking("Đang suy nghĩ...");
    try {
        const res = await fetch(`${API_URL}/chat/stream`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: prompt, user_id: USER_ID, session_id: session_id })
        });
        if (!res.body) { removeThinking(); botError("Không nhận được phản hồi."); return; }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            for (let i = 0; i < lines.length - 1; i++) {
                const line = lines[i].trim();
                if (line.startsWith("data: ")) {
                    try {
                        const data = JSON.parse(line.slice(6));
                        handleStreamEvent(data);
                    } catch (e) { console.error("SSE parse error:", e); }
                }
            }
            buffer = lines[lines.length - 1];
        }
        removeThinking();
    } catch (e) { removeThinking(); botError("Lỗi kết nối. Vui lòng thử lại."); console.error(e); }
}

// ============================================================
// HANDLE STREAM EVENTS
// ============================================================
function handleStreamEvent(data) {
    console.log("Stream event:", data);
    if (data.type === "recommend_questions") { removeThinking(); renderRecommendations(data.content); return; }
    if (data.type === "notification") { showNotification(data.content); return; }
    if (currentNotificationEl) { currentNotificationEl.remove(); currentNotificationEl = null; }

    if (data.type === "final_response") {
        removeThinking();
        const text = extractResponseText(data.content);
        if (text) bot(formatResponseText(text));
    } else if (data.type === "table") { removeThinking(); renderTable(data.content); }
    else if (data.type === "chart") { removeThinking(); renderChart(data.content); }
    else if (data.type === "file") { removeThinking(); renderFile(data.content); }
    scrollBottom();
}

function extractResponseText(content) {
    if (!content) return "";
    if (typeof content === "string") {
        try { let j = content.replace(/'/g, '"'); const p = JSON.parse(j); return p.response || content; }
        catch { return content; }
    }
    if (typeof content === "object" && content.response) return content.response;
    return String(content);
}

function formatResponseText(text) {
    return text.replace(/\n/g, "<br/>").replace(/\*\*(.*?)\*\*/g, "<b>$1</b>");
}

function showNotification(text) {
    if (currentNotificationEl) { currentNotificationEl.textContent = text; return; }
    currentNotificationEl = document.createElement("div");
    currentNotificationEl.className = "msg bot";
    currentNotificationEl.style.cssText = "font-size:12px;color:#64748b;font-style:italic;background:#f8fafc;padding:6px 12px;border-radius:8px;margin:4px 0;";
    currentNotificationEl.textContent = text;
    if (thinkingEl && thinkingEl.parentNode) thinkingEl.parentNode.insertBefore(currentNotificationEl, thinkingEl.nextSibling);
    else chatBox.appendChild(currentNotificationEl);
    scrollBottom();
}

// ============================================================
// TABLE RENDERING (with auto-transpose)
// ============================================================
function transposeTableIfNeeded(html) {
    try {
        const doc = new DOMParser().parseFromString(html, "text/html");
        const table = doc.querySelector("table");
        if (!table) return html;
        const rows = Array.from(table.rows);
        if (rows.length === 0) return html;
        const headers = Array.from(rows[0].querySelectorAll("th, td"));
        const isWide = headers.length > 5, isSingleRow = rows.length === 2;
        if (!isWide && !isSingleRow) return html;
        if (headers.length === 1 && rows.length > 1) return html;
        const colNames = headers.map(h => h.innerHTML), dataRows = rows.slice(1);
        let t = '<table border="1">';
        for (let i = 0; i < colNames.length; i++) {
            t += `<tr><th>${colNames[i]}</th>`;
            for (let j = 0; j < dataRows.length; j++) { const c = dataRows[j].cells[i]; t += `<td>${c ? c.innerHTML : ""}</td>`; }
            t += "</tr>";
        }
        return t + "</table>";
    } catch { return html; }
}

function renderTable(content) {
    const styled = transposeTableIfNeeded(content)
        .replace(/border="1"/g, "")
        .replace(/<table/g, '<table style="border-collapse:collapse;width:100%;font-size:12px;color:#1e293b;"')
        .replace(/<th/g, '<th style="border:1px solid #e2e8f0;padding:6px 8px;background:#f0f9ff;text-align:left;font-weight:600;color:#475569;"')
        .replace(/<td/g, '<td style="border:1px solid #e2e8f0;padding:6px 8px;"');
    const w = document.createElement("div");
    w.style.cssText = "overflow-x:auto;margin:8px 0;border-radius:8px;border:1px solid #e2e8f0;";
    w.innerHTML = styled;
    botElement(w);
}

// ============================================================
// CHART RENDERING (fetch + Plotly scaling)
// ============================================================
function renderChart(content) {
    if (typeof content !== "string") return;
    const container = document.createElement("div");
    container.style.cssText = "margin:8px 0;border-radius:10px;overflow:hidden;border:1px solid #e2e8f0;";

    if (content.startsWith("http")) {
        container.innerHTML = '<div style="height:200px;display:flex;align-items:center;justify-content:center;color:#94a3b8;font-size:13px;">📊 Đang tải biểu đồ...</div>';
        botElement(container);
        fetch(content).then(r => r.text()).then(html => {
            const css = '<style>body,html{margin:0;padding:0;overflow:hidden;background:white;} .plotly-graph-div{transform-origin:top left !important;}</style>';
            const js = `<script>function rp(){var g=document.querySelector('.plotly-graph-div');if(g){var w=g.offsetWidth||800,h=g.offsetHeight||600,s=Math.min(window.innerWidth/w,window.innerHeight/h);g.style.transform='scale('+s+')';g.style.marginLeft=Math.max(0,(window.innerWidth-w*s)/2)+'px';g.style.marginTop=Math.max(0,(window.innerHeight-h*s)/2)+'px';}}window.addEventListener('load',function(){setTimeout(rp,50);setTimeout(rp,500)});window.addEventListener('resize',rp);<\/script>`;
            let final = html;
            if (html.includes("plotly-graph-div")) final = html.replace("</head>", css + js + "</head>");
            const iframe = document.createElement("iframe");
            iframe.style.cssText = "width:100%;height:250px;border:0;";
            iframe.sandbox = "allow-scripts allow-same-origin";
            iframe.scrolling = "no";
            iframe.srcdoc = final;
            container.innerHTML = "";
            container.appendChild(iframe);
        }).catch(() => { container.innerHTML = '<div style="padding:12px;color:#b91c1c;font-size:12px;">❌ Lỗi tải biểu đồ</div>'; });
    } else if (content.includes("<html")) {
        const iframe = document.createElement("iframe");
        iframe.style.cssText = "width:100%;height:250px;border:0;";
        iframe.sandbox = "allow-scripts allow-same-origin";
        iframe.scrolling = "no";
        iframe.srcdoc = content;
        container.appendChild(iframe);
        botElement(container);
    }
}

// ============================================================
// FILE RENDERING
// ============================================================
function renderFile(content) {
    let filename = "Tệp đính kèm", url = content;
    if (typeof content === "string") {
        const m = content.match(/\[(.+?)\]\((.+?)\)/);
        if (m) { filename = m[1]; url = m[2]; }
        else if (content.startsWith("http")) {
            const p = content.split("/").pop().split("?")[0];
            if (p && p.includes(".")) filename = decodeURIComponent(p);
        }
    }
    const ext = (filename.match(/\.([a-zA-Z0-9]+)$/) || [])[1];
    const e = ext ? ext.toUpperCase() : "FILE";
    const isPdf = e === "PDF", isExcel = ["XLSX","XLS","CSV"].includes(e);
    const bg = isPdf ? "#fef2f2" : isExcel ? "#ecfdf5" : "#f8fafc";
    const ic = isPdf ? "#ef4444" : isExcel ? "#10b981" : "#64748b";
    const bc = isPdf ? "#fecaca" : isExcel ? "#a7f3d0" : "#e2e8f0";

    const card = document.createElement("a");
    card.href = url; card.target = "_blank"; card.rel = "noopener noreferrer";
    card.style.cssText = `display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:10px;border:1px solid ${bc};background:${bg};text-decoration:none;margin:8px 0;`;
    card.innerHTML = `<div style="width:36px;height:44px;border-radius:6px;background:#fff;border:1px solid ${bc};display:flex;align-items:center;justify-content:center;flex-shrink:0;"><span style="font-size:10px;font-weight:800;color:${ic};">${e.slice(0,4)}</span></div><div style="flex:1;min-width:0;"><div style="font-size:13px;font-weight:600;color:#1e293b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(filename)}</div><div style="font-size:11px;color:#94a3b8;margin-top:2px;">Tài liệu ${e} · <span style="color:#3b82f6;">Tải xuống</span></div></div><div style="color:#94a3b8;font-size:16px;">⬇</div>`;
    botElement(card);
}

// ============================================================
// RECOMMENDATIONS
// ============================================================
function renderRecommendations(content) {
    let q = [];
    if (Array.isArray(content)) q = content;
    else if (typeof content === "object" && content && Array.isArray(content.recommend_next_questions)) q = content.recommend_next_questions;
    else if (typeof content === "string") {
        try { let j = content.replace(/'/g, '"'); const p = JSON.parse(j); q = Array.isArray(p) ? p : (p.recommend_next_questions || []); } catch { q = [content]; }
    }
    if (q.length === 0) return;
    let html = "<b>💡 Gợi ý:</b><br/>";
    q.forEach(s => { html += `<div class="quick-btn" data-msg="${encodeURIComponent(s)}">${escapeHtml(s)}</div>`; });
    bot(html);
}

// ============================================================
// HISTORY PANEL
// ============================================================
let historyOverlay = null;
function toggleHistory() { historyOverlay ? closeHistory() : showHistory(); }

function showHistory() {
    // 1. Hiện panel NGAY LẬP TỨC với spinner
    historyOverlay = document.createElement("div");
    historyOverlay.style.cssText = "position:absolute;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.4);z-index:100;display:flex;animation:fadeIn .15s ease;";
    const panel = document.createElement("div");
    panel.style.cssText = "width:260px;background:#fff;height:100%;display:flex;flex-direction:column;box-shadow:4px 0 20px rgba(0,0,0,0.1);transform:translateX(0);animation:slideIn .2s ease;";

    panel.innerHTML = `<div style="padding:14px 16px;border-bottom:1px solid #f1f5f9;display:flex;justify-content:space-between;align-items:center;"><span style="font-weight:600;font-size:14px;">Lịch sử trò chuyện</span><span id="closeHistBtn" style="cursor:pointer;color:#94a3b8;font-size:18px;">✕</span></div>`;

    const newBtn = document.createElement("div");
    newBtn.style.cssText = "margin:8px 12px;padding:8px;background:#3b82f6;color:#fff;border-radius:8px;text-align:center;font-size:13px;font-weight:500;cursor:pointer;";
    newBtn.textContent = "+ Đoạn chat mới";
    newBtn.onclick = async () => { closeHistory(); await startNewChat(); };
    panel.appendChild(newBtn);

    const list = document.createElement("div");
    list.style.cssText = "flex:1;overflow-y:auto;padding:8px;";
    // Spinner placeholder
    list.innerHTML = '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;margin-top:40px;"><div style="width:24px;height:24px;border:3px solid #e2e8f0;border-top-color:#3b82f6;border-radius:50%;animation:spin .6s linear infinite;"></div><span style="font-size:12px;color:#94a3b8;">Đang tải...</span></div>';
    panel.appendChild(list);

    historyOverlay.appendChild(panel);
    historyOverlay.addEventListener("click", e => { if (e.target === historyOverlay) closeHistory(); });
    chatBody.style.position = "relative";
    chatBody.appendChild(historyOverlay);
    document.getElementById("closeHistBtn").onclick = closeHistory;

    // 2. Inject CSS animation (chỉ 1 lần)
    if (!document.getElementById("histAnimStyle")) {
        const style = document.createElement("style");
        style.id = "histAnimStyle";
        style.textContent = "@keyframes spin{to{transform:rotate(360deg)}} @keyframes fadeIn{from{opacity:0}to{opacity:1}} @keyframes slideIn{from{transform:translateX(-100%)}to{transform:translateX(0)}}";
        document.head.appendChild(style);
    }

    // 3. Fetch data ASYNC, rồi điền vào list
    fetchSessions().then(sessions => {
        if (!historyOverlay) return; // đã đóng trước khi fetch xong
        list.innerHTML = "";
        if (!sessions.length) { list.innerHTML = '<div style="text-align:center;color:#94a3b8;font-size:12px;margin-top:20px;">Chưa có lịch sử</div>'; return; }
        sessions.sort((a,b) => new Date(b.created_at||0) - new Date(a.created_at||0)).forEach(s => {
            const item = document.createElement("div");
            const active = s.session_id === session_id;
            item.style.cssText = `padding:10px;border-radius:8px;cursor:pointer;margin-bottom:4px;border:1px solid ${active?"#bfdbfe":"transparent"};background:${active?"#eff6ff":"#fff"};transition:background .15s;`;
            item.onmouseenter = () => { if (!active) item.style.background = "#f8fafc"; };
            item.onmouseleave = () => { if (!active) item.style.background = "#fff"; };
            let timeStr = "";
            try { if (s.created_at) timeStr = new Date(s.created_at).toLocaleString("vi-VN"); } catch {}
            item.innerHTML = `<div style="font-size:13px;color:#1e293b;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(s.title||"Cuộc trò chuyện")}</div>${timeStr?`<div style="font-size:10px;color:#94a3b8;margin-top:3px;">${timeStr}</div>`:""}`;
            item.onclick = () => { closeHistory(); loadSession(s.session_id); };
            list.appendChild(item);
        });
    });
}
function closeHistory() { if (historyOverlay) { historyOverlay.remove(); historyOverlay = null; } }

async function startNewChat() { chatBox.innerHTML = ""; showChatIntro(); session_id = null; await createSession(); }

// ============================================================
// INTRO
// ============================================================
const intro = document.getElementById("chatIntro");
const introTitle = document.getElementById("introTitle");
const introDesc = document.getElementById("introDesc");
function setIntroContent() { if (introTitle) introTitle.innerText = "Hi,"; if (introDesc) introDesc.innerText = "Where should we start?"; }
setIntroContent();
window.hideChatIntro = function () { if (intro) intro.classList.add("hidden"); };
window.showChatIntro = function () { if (intro) intro.classList.remove("hidden"); };
function hideChatIntro() { if (intro) intro.classList.add("hidden"); }
function showChatIntro() { if (intro) intro.classList.remove("hidden"); }
window.clearChat = function () { chatBox.innerHTML = ""; if (chatIntro) chatIntro.classList.remove("hidden"); };

// ============================================================
// TOOL ICONS & SELECTOR (preserved)
// ============================================================
const TOOL_ICONS = {
    HRAssistant: `<svg viewBox="0 0 24 24" width="16" height="16"><path d="M16 11c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3 1.34 3 3 3zM8 11c1.66 0 3-1.34 3-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zM8 13c-2.33 0-7 1.17-7 3.5V19h14v-2.5C15 14.17 10.33 13 8 13zM16 13c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" fill="currentColor"/></svg>`,
    WarehouseAssistant: `<svg viewBox="0 0 24 24" width="16" height="16"><path d="M3 9l9-5 9 5v11H3V9zm2 2v7h4v-4h6v4h4v-7" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>`,
    NDTAssistant: `<svg viewBox="0 0 24 24" width="16" height="16"><path d="M4 6h16M4 12h16M4 18h16M9 6v12" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>`,
    QHSEAssistant: `<svg viewBox="0 0 24 24" width="16" height="16"><path d="M12 2l8 4v6c0 5-3.5 9.5-8 10-4.5-.5-8-5-8-10V6l8-4z" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>`,
    TrainingAssistant: `<svg viewBox="0 0 24 24" width="16" height="16"><path d="M4 4h16v12H4zM2 20h20" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>`
};
let currentTool = "HRAssistant";

document.addEventListener("DOMContentLoaded", () => {
    const toolBtn = document.getElementById("toolBtn");
    const dropdown = document.getElementById("toolDropdown");
    const iconEl = document.getElementById("toolIcon");
    const items = dropdown.querySelectorAll(".tool-item");
    const saved = localStorage.getItem("ai_tool");
    if (saved && TOOL_ICONS[saved]) currentTool = saved;
    iconEl.innerHTML = TOOL_ICONS[currentTool];

    toolBtn.addEventListener("click", (e) => { e.stopPropagation(); dropdown.classList.toggle("hidden"); });
    items.forEach(item => {
        item.addEventListener("click", () => {
            items.forEach(i => i.classList.remove("active"));
            item.classList.add("active");
            currentTool = item.dataset.tool;
            iconEl.innerHTML = TOOL_ICONS[currentTool];
            localStorage.setItem("ai_tool", currentTool);
            dropdown.classList.add("hidden");
        });
    });
    document.addEventListener("click", () => { dropdown.classList.add("hidden"); });

    // Wire History & New Chat buttons
    const histBtn = document.querySelector('.icon-btn[title="History"]');
    const newChatBtn = document.querySelector('.icon-btn.new-chat');
    if (histBtn) histBtn.addEventListener("click", toggleHistory);
    if (newChatBtn) newChatBtn.addEventListener("click", startNewChat);

    checkAuth();
    document.getElementById("btnLogin")?.addEventListener("click", login);
    document.getElementById("btnLogout")?.addEventListener("click", logout);
});

// ============================================================
// AUTH SYSTEM (preserved exactly)
// ============================================================
const API_BASE = "https://api.alpha-ndt.com/api";
let authToken = null;

async function checkAuth() {
    authToken = localStorage.getItem("ai_token");
    if (!authToken) { showLogin(); return; }
    showChat();
    await loadAndRenderUser();
}
async function loadAndRenderUser() {
    try {
        const res = await fetch("https://api.alpha-ndt.com/api/Auth/GetUserInfo", {
            method: "GET", headers: { "Authorization": "Bearer " + authToken, "Accept": "application/json" }
        });
        if (!res.ok) throw new Error("Unauthorized");
        const u = await res.json();
        document.getElementById("userAvatar").src = "aiavartandt.png";
        document.getElementById("userName").textContent = u.fullName || u.email || "User";
    } catch (e) { logout(); }
}
function logout() { localStorage.removeItem("ai_token"); authToken = null; showLogin(); }
async function login() {
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;
    const errorEl = document.getElementById("loginError");
    errorEl.textContent = "";
    try {
        const res = await fetch(`${API_BASE}/auth/login`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: username, password: password })
        });
        if (!res.ok) throw new Error("Login failed");
        const data = await res.json();
        authToken = data.token;
        localStorage.setItem("ai_token", authToken);
        showChat();
        await loadAndRenderUser();
    } catch (err) { errorEl.textContent = "Login failed"; }
}
function showLogin() { document.getElementById("loginView").classList.remove("hidden"); document.getElementById("chatWindow").classList.add("hidden"); }
function showChat() {
    document.getElementById("loginView").classList.add("hidden");
    document.getElementById("chatWindow").classList.remove("hidden");
    if (!session_id) createSession();
}

// ============================================================
// MIC (preserved)
// ============================================================
let recognition = null, listening = false, aiProcessing = false, finalText = "", micEnabled = false, lock = false;
const micBtnEl = document.getElementById("micBtn");
if (micBtnEl) {
    micBtnEl.addEventListener("click", () => {
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SR) { micBtnEl.style.display = "none"; return; }
        if (aiProcessing || lock) return;
        lock = true; setTimeout(() => lock = false, 120);
        if (!micEnabled) {
            micEnabled = true; listening = true; finalText = "";
            micBtnEl.classList.add("active");
            recognition = createRecognition();
            try { recognition.start(); } catch {}
        } else {
            forceStop();
            if (ta.value.trim()) sendMessage("");
        }
    });
}
function createRecognition() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const r = new SR(); r.lang = "vi-VN"; r.continuous = true; r.interimResults = true;
    r.onresult = (e) => {
        if (!micEnabled) return;
        let interim = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
            const txt = e.results[i][0].transcript;
            if (e.results[i].isFinal) finalText += txt + " "; else interim += txt;
        }
        ta.value = finalText + interim;
    };
    r.onerror = () => forceStop();
    r.onend = () => {};
    return r;
}
function forceStop() {
    micEnabled = false; listening = false;
    if (micBtnEl) micBtnEl.classList.remove("active");
    if (recognition) { try { recognition.abort(); } catch {} recognition = null; }
}