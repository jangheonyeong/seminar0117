// ✅ Vite 환경변수: .env에 아래처럼 저장되어 있어야 브라우저 번들에서 읽힙니다.
// VITE_OPENAI_API_KEY=sk-...
//
// ⚠️ 주의: 이렇게 하면 API 키가 클라이언트에 노출됩니다(권장되지 않음).

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
const DEFAULT_MODEL = "gpt-4.1-mini";
const ENDPOINT = "https://api.openai.com/v1/responses";

const chatEl = document.querySelector("#chat");
const inputEl = document.querySelector("#input");
const sendBtn = document.querySelector("#sendBtn");
const clearBtn = document.querySelector("#clearBtn");
const bannerEl = document.querySelector("#banner");
const modelSelect = document.querySelector("#modelSelect");

const STORAGE_KEY = "basicChatbotHistory_v1";

// in-memory conversation (user/assistant only; instructions는 별도)
let messages = loadHistory();

// 초기 UI
modelSelect.value = DEFAULT_MODEL;
renderAll();
autosize();

if (!OPENAI_API_KEY) {
  showBanner(
    "VITE_OPENAI_API_KEY가 비어 있습니다. .env에 설정 후 dev 서버를 재시작해 주세요."
  );
  sendBtn.disabled = true;
}

// 이벤트: Enter 전송 / Shift+Enter 줄바꿈
inputEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

inputEl.addEventListener("input", autosize);
sendBtn.addEventListener("click", sendMessage);

clearBtn.addEventListener("click", () => {
  messages = [];
  saveHistory(messages);
  chatEl.innerHTML = "";
  hideBanner();
  // 안내 메시지
  appendBot("대화를 초기화했습니다. 무엇을 도와드릴까요?");
});

if (messages.length === 0) {
  appendBot("안녕하세요! 간단한 챗봇입니다. 무엇을 도와드릴까요?");
}

// ---------------------- UI helpers ----------------------

function autosize() {
  inputEl.style.height = "auto";
  inputEl.style.height = Math.min(inputEl.scrollHeight, 160) + "px";
}

function showBanner(text) {
  bannerEl.hidden = false;
  bannerEl.textContent = text;
}

function hideBanner() {
  bannerEl.hidden = true;
  bannerEl.textContent = "";
}

function scrollToBottom() {
  chatEl.scrollTop = chatEl.scrollHeight;
}

function escapeHtml(str) {
  return str
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function appendRow(role, text, meta = "") {
  const row = document.createElement("div");
  row.className = `msg-row ${role}`;

  const bubble = document.createElement("div");
  bubble.className = `bubble ${role}`;
  bubble.innerHTML = escapeHtml(text);

  row.appendChild(bubble);

  if (meta) {
    const metaEl = document.createElement("div");
    metaEl.className = "meta";
    metaEl.textContent = meta;
    row.appendChild(metaEl);
  }

  chatEl.appendChild(row);
  scrollToBottom();
  return { row, bubble };
}

function appendUser(text) {
  appendRow("user", text);
}

function appendBot(text) {
  appendRow("bot", text);
}

function appendTyping() {
  const row = document.createElement("div");
  row.className = "msg-row bot";

  const bubble = document.createElement("div");
  bubble.className = "bubble bot";
  bubble.innerHTML = `
    <span class="typing" aria-label="Assistant typing">
      <span class="dot"></span><span class="dot"></span><span class="dot"></span>
    </span>
  `;

  row.appendChild(bubble);
  chatEl.appendChild(row);
  scrollToBottom();
  return row;
}

function renderAll() {
  chatEl.innerHTML = "";
  for (const m of messages) {
    if (m.role === "user") appendUser(m.content);
    if (m.role === "assistant") appendBot(m.content);
  }
  scrollToBottom();
}

// ---------------------- storage ----------------------

function loadHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((x) => x && (x.role === "user" || x.role === "assistant") && typeof x.content === "string")
      .slice(-30);
  } catch {
    return [];
  }
}

function saveHistory(arr) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(arr.slice(-30)));
  } catch {
    // ignore
  }
}

// ---------------------- OpenAI call ----------------------

function buildInputForResponsesAPI() {
  // Responses API는 input에 메시지 배열(roles 포함)도 받을 수 있습니다. :contentReference[oaicite:3]{index=3}
  return messages.map((m) => ({ role: m.role, content: m.content }));
}

function extractOutputText(data) {
  // 1) 가장 쉬운 케이스: output_text
  if (typeof data?.output_text === "string" && data.output_text.trim()) {
    return data.output_text;
  }

  // 2) output 배열을 순회하며 텍스트 추출(형식이 바뀌어도 최대한 대응)
  const out = data?.output;
  if (Array.isArray(out)) {
    let collected = "";
    for (const item of out) {
      const content = item?.content;
      if (Array.isArray(content)) {
        for (const part of content) {
          if (typeof part?.text === "string") collected += part.text;
          else if (typeof part?.content === "string") collected += part.content;
        }
      }
      // 일부 응답은 item.output_text 같은 형태가 있을 수 있어 방어적으로 처리
      if (typeof item?.output_text === "string") collected += item.output_text;
    }
    if (collected.trim()) return collected.trim();
  }

  return "";
}

async function callOpenAI() {
  const model = modelSelect.value || DEFAULT_MODEL;

  const payload = {
    model,
    instructions: "You are a helpful assistant. Reply concisely and clearly.",
    input: buildInputForResponsesAPI(),
    // store 기본값은 계정/설정에 따라 달라질 수 있으므로, 원치 않으시면 false로 두셔도 됩니다.
    store: false,
  };

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} ${res.statusText}\n${txt}`);
  }

  const data = await res.json();
  const text = extractOutputText(data);

  if (!text) {
    throw new Error("응답 파싱에 실패했습니다. (output_text가 비어 있음)");
  }

  return text;
}

// ---------------------- main send flow ----------------------

async function sendMessage() {
  hideBanner();

  const userText = inputEl.value.trim();
  if (!userText) return;

  if (!OPENAI_API_KEY) {
    showBanner("API 키가 없습니다. .env의 VITE_OPENAI_API_KEY를 확인해 주세요.");
    return;
  }

  inputEl.value = "";
  autosize();

  // UI + history
  appendUser(userText);
  messages.push({ role: "user", content: userText });
  saveHistory(messages);

  // typing indicator
  sendBtn.disabled = true;
  const typingRow = appendTyping();

  try {
    // 최근 메시지만 유지(토큰 과다 방지)
    messages = messages.slice(-20);

    const botText = await callOpenAI();

    // typing 제거 후 메시지 추가
    typingRow.remove();
    appendBot(botText);

    messages.push({ role: "assistant", content: botText });
    saveHistory(messages);
  } catch (err) {
    typingRow.remove();

    const msg =
      String(err?.message || err) ||
      "알 수 없는 오류가 발생했습니다.";

    // CORS 가능성 안내
    if (msg.toLowerCase().includes("cors") || msg.toLowerCase().includes("failed to fetch")) {
      showBanner(
        "브라우저에서 OpenAI API가 CORS로 차단된 것 같습니다. 이 경우 클라이언트만으로는 해결이 어렵고, 서버(프록시/서버리스)가 필요할 수 있습니다."
      );
    } else {
      showBanner(msg);
    }

    appendBot("죄송합니다. 요청을 처리하지 못했습니다. 위 오류 메시지를 확인해 주세요.");
  } finally {
    sendBtn.disabled = false;
    inputEl.focus();
  }
}
