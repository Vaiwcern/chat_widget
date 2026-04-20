(() => {
    if (document.getElementById("ai-float-btn")) return;

    const btn = document.createElement("div");
    btn.id = "ai-float-btn";
    btn.innerHTML = `
  <img src="${chrome.runtime.getURL("AIAgentLogoOnly.png")}" />
`;
    //btn.innerHTML = "🧠";

    btn.onclick = () => {
        chrome.runtime.sendMessage({ type: "OPEN_PANEL" });
    };

    document.body.appendChild(btn);

    const style = document.createElement("style");
    style.innerHTML = `
    #ai-float-btn {
        position: fixed;
            bottom: 60px; /* Cách đáy 20px */
            right: 0px;  /* Cách phải 20px */
            z-index: 1000;
            transition: transform 0.3s ease;
            border-radius: 999px 0 0 999px;            
            background:#fff;
            margin-bottom:auto;
            margin-top:auto;
            box-shadow: 0 4px 12px rgba(0,0,0,.3);
            padding: 5px 5px;
            border:solid 1px #e3e3e3;
            cursor:pointer;
            display: flex;
    }
    #ai-float-btn img {
      width: 32px;
      height: 32px;
        margin-top: auto;
        margin-bottom: auto;
    }

  `;
    document.head.appendChild(style);
})();
