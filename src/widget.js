// Replybek chat widget. Usage:
//   <script src=".../replybek-widget.js" data-key="pk_…" data-api="https://api.example.com" defer></script>
// Optional: data-language="uz|ru|en"; data-launcher="none" hides the floating button, and the page
// opens the chat with window.Replybek.open() (also .close(), .toggle()) after "replybek:ready".
// Everything renders inside a shadow root, so the host page's CSS can't affect it (and vice versa).
// Visitor text is only ever inserted with textContent, never as HTML.
import css from "./widget.css?inline";

(function () {
  const script = document.currentScript || document.querySelector('script[data-key][src*="replybek-widget"]') || document.querySelector("script[data-replybek-key]");
  const KEY = script && (script.dataset.key || script.dataset.replybekKey);
  const API = script && (script.dataset.api || "").replace(/\/$/, "");
  const LANGUAGE = String(script?.dataset.language || document.documentElement.lang || navigator.language || "en").toLowerCase().split("-")[0];
  if (!KEY || !API) return console.warn("[Replybek] Add data-key and data-api to the widget script tag.");
  if (window.__replybekWidget) return; // pasted twice
  window.__replybekWidget = true;
  // When loaded inside the business system's own page (data-inpage), the widget can run the AI's
  // tool requests here, with the user's own session. INPAGE is the origin those requests go to.
  const INPAGE = script && (script.dataset.inpage !== undefined) ? location.origin : null;
  // data-launcher="none": no floating button; the page opens the chat itself with window.Replybek.open().
  const NO_LAUNCHER = script?.dataset.launcher === "none";

  // ───── Words ─────
  // The widget speaks the page's language when it's one we have; English otherwise.
  const LANG = ["en", "uz", "ru"].includes(LANGUAGE) ? LANGUAGE : "en";
  const STRINGS = {
    en: {
      open: "Open chat", chat: "Chat", chatWith: "Chat with {name}", minimize: "Minimize chat",
      ask: "Ask a question", message: "Message", send: "Send message",
      person: "Talk to a person", wantPerson: "I'd like to talk to a person.", newChat: "Start a new chat",
      powered: "Powered by Replybek",
      note: "Answers are written by AI from this business's information. A person can help if you need one.",
      sources: { one: "{count} source used", other: "{count} sources used" },
      signInTo: "Sign in to {name}", signInNote: "You'll sign in on their page. Your password isn't shared with this chat.", signIn: "Sign in",
      pleaseConfirm: "Please confirm", confirm: "Confirm", cancel: "Cancel",
      confirmed: "Confirmed", cancelled: "Cancelled", failed: "Didn't go through",
      team: "{name} team", typing: "AI agent is typing",
      handoff: "A teammate has been asked to join. They'll reply here; you can keep this page open or come back later.",
      replying: "A teammate is replying", waiting: "Waiting for the team", agent: "{name} · AI agent",
      errSend: "Couldn't send your message. Check your connection and try again.",
      errExpired: "This chat expired. Please send your message again.",
      wrong: "Something went wrong.",
      attach: "Attach a file", removeFile: "Remove file", photo: "Photo", openPhoto: "Open photo", download: "Download {name}",
      fileTooBig: "Files can be up to 10 MB.", fileType: "Send a photo, a PDF or a document (TXT, CSV, DOCX, XLSX).",
      kb: "{n} KB", mb: "{n} MB",
    },
    uz: {
      open: "Chatni ochish", chat: "Chat", chatWith: "{name} bilan chat", minimize: "Chatni yigʻish",
      ask: "Savol bering", message: "Xabar", send: "Yuborish",
      person: "Xodim bilan gaplashish", wantPerson: "Xodim bilan gaplashmoqchiman.", newChat: "Yangi chat boshlash",
      powered: "Replybek asosida",
      note: "Javoblarni AI shu biznes maʼlumotlari asosida yozadi. Kerak boʻlsa, xodim yordam beradi.",
      sources: { other: "{count} ta manba ishlatildi" },
      signInTo: "{name} tizimiga kirish", signInNote: "Ularning sahifasida kirasiz. Parolingiz bu chatga berilmaydi.", signIn: "Kirish",
      pleaseConfirm: "Tasdiqlang", confirm: "Tasdiqlash", cancel: "Bekor qilish",
      confirmed: "Tasdiqlandi", cancelled: "Bekor qilindi", failed: "Amalga oshmadi",
      team: "{name} jamoasi", typing: "AI agent yozmoqda",
      handoff: "Xodimga xabar berildi. U shu yerda javob beradi: sahifani ochiq qoldirishingiz yoki keyinroq qaytishingiz mumkin.",
      replying: "Xodim javob bermoqda", waiting: "Jamoa kutilmoqda", agent: "{name} · AI agent",
      errSend: "Xabar yuborilmadi. Internetni tekshirib, qayta urinib koʻring.",
      errExpired: "Bu chat muddati tugadi. Xabaringizni qayta yuboring.",
      wrong: "Nimadir xato ketdi.",
      attach: "Fayl biriktirish", removeFile: "Faylni olib tashlash", photo: "Rasm", openPhoto: "Rasmni ochish", download: "{name} faylini yuklab olish",
      fileTooBig: "Fayl hajmi 10 MB dan oshmasin.", fileType: "Rasm, PDF yoki hujjat yuboring (TXT, CSV, DOCX, XLSX).",
      kb: "{n} KB", mb: "{n} MB",
    },
    ru: {
      open: "Открыть чат", chat: "Чат", chatWith: "Чат с {name}", minimize: "Свернуть чат",
      ask: "Задайте вопрос", message: "Сообщение", send: "Отправить",
      person: "Связаться с сотрудником", wantPerson: "Хочу поговорить с сотрудником.", newChat: "Начать новый чат",
      powered: "Работает на Replybek",
      note: "Ответы пишет ИИ по информации этой компании. Если нужно, поможет сотрудник.",
      sources: { one: "Использован {count} источник", few: "Использовано {count} источника", many: "Использовано {count} источников", other: "Использовано {count} источника" },
      signInTo: "Вход в {name}", signInNote: "Вы войдёте на их странице. Пароль не передаётся в этот чат.", signIn: "Войти",
      pleaseConfirm: "Подтвердите", confirm: "Подтвердить", cancel: "Отмена",
      confirmed: "Подтверждено", cancelled: "Отменено", failed: "Не получилось",
      team: "Команда {name}", typing: "ИИ-агент печатает",
      handoff: "Мы позвали сотрудника. Он ответит здесь: можно оставить страницу открытой или вернуться позже.",
      replying: "Отвечает сотрудник", waiting: "Ждём команду", agent: "{name} · ИИ-агент",
      errSend: "Не удалось отправить сообщение. Проверьте интернет и попробуйте ещё раз.",
      errExpired: "Этот чат устарел. Отправьте сообщение ещё раз.",
      wrong: "Что-то пошло не так.",
      attach: "Прикрепить файл", removeFile: "Убрать файл", photo: "Фото", openPhoto: "Открыть фото", download: "Скачать {name}",
      fileTooBig: "Файл должен быть не больше 10 МБ.", fileType: "Отправьте фото, PDF или документ (TXT, CSV, DOCX, XLSX).",
      kb: "{n} КБ", mb: "{n} МБ",
    },
  };
  const plural = new Intl.PluralRules(LANG);
  function t(key, params = {}) {
    let s = STRINGS[LANG][key] ?? STRINGS.en[key];
    if (s && typeof s === "object") s = s[plural.select(params.count ?? 0)] ?? s.other;
    return String(s).replace(/\{(\w+)\}/g, (m, k) => (params[k] == null ? m : String(params[k])));
  }
  const LOCALE = { en: "en-US", uz: "uz-UZ", ru: "ru-RU" }[LANG];

  const STORE = `replybek:${KEY}`;
  const load = () => {
    try {
      return JSON.parse(localStorage.getItem(STORE)) || {};
    } catch {
      return {};
    }
  };
  const save = (v) => {
    try {
      localStorage.setItem(STORE, JSON.stringify(v));
    } catch {
      // Private browsing: the chat still works, it just won't survive a reload.
    }
  };

  // ───── Tiny DOM helper ─────
  function h(tag, props = {}, ...kids) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
      if (v == null || v === false) continue;
      if (k === "class") el.className = v;
      else if (k === "text") el.textContent = v;
      else if (k.startsWith("on")) el.addEventListener(k.slice(2).toLowerCase(), v);
      else el.setAttribute(k, v === true ? "" : v);
    }
    for (const kid of kids.flat()) if (kid != null && kid !== false) el.append(kid);
    return el;
  }
  const ICON = {
    chat: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
    minus: '<path d="M5 12h14"/>',
    x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    send: '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
    person: '<path d="M3 11h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-5Zm0 0a9 9 0 1 1 18 0m0 0v5a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3Z"/><path d="M21 16v2a4 4 0 0 1-4 4h-5"/>',
    chev: '<path d="m9 18 6-6-6-6"/>',
    lock: '<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    clip: '<path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/>',
    file: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/>',
  };
  const icon = (name, size = 18) => {
    const s = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    s.setAttribute("viewBox", "0 0 24 24");
    s.setAttribute("width", size);
    s.setAttribute("height", size);
    s.setAttribute("fill", "none");
    s.setAttribute("stroke", "currentColor");
    s.setAttribute("stroke-width", "2");
    s.setAttribute("stroke-linecap", "round");
    s.setAttribute("stroke-linejoin", "round");
    s.setAttribute("aria-hidden", "true");
    s.innerHTML = ICON[name]; // static markup from this file only
    return s;
  };
  const initials = (s) => s.split(/\s+/).filter(Boolean).map((p) => p[0]).join("").slice(0, 2).toUpperCase();
  const time = (at) => new Date(at).toLocaleTimeString(LOCALE, { hour: "numeric", minute: "2-digit" });

  const headers = (token, json) => ({ "Accept-Language": LANG, ...(json ? { "Content-Type": "application/json" } : {}), ...(token ? { "X-Visitor-Token": token } : {}), ...(INPAGE ? { "X-Replybek-Inpage": INPAGE } : {}) });
  async function call(method, path, body, token) {
    const form = body instanceof FormData;
    const res = await fetch(`${API}/widget/${KEY}${path}`, {
      method,
      headers: headers(token, Boolean(body) && !form),
      body: form ? body : body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw Object.assign(new Error(data.message || t("wrong")), { status: res.status });
    return data;
  }

  // ───── State ─────
  let config;
  let session = load(); // { conversation_id, visitor_token }
  let messages = []; // from the server
  let status = "ai";
  let open = false;
  let sending = false;
  let unseen = 0;
  let pollTimer = null;
  let thinking = false;      // the AI is working (answering with tools, or finishing a confirmed change)
  let activeTimer = null;    // the fast poll that runs while thinking
  let live = null;           // the open live-updates request (an AbortController)
  let liveUp = false;        // events are flowing, so polling only backs them up
  const running = new Set(); // in-page tool calls being executed right now

  // ───── Shell ─────
  const host = h("div", { id: "replybek-widget" });
  const root = host.attachShadow({ mode: "open" });
  root.append(h("style", { text: css }));
  const launcher = h("button", { class: "launcher", type: "button", "aria-expanded": "false", "aria-label": t("open"), onClick: () => toggle() }, icon("chat", 24));
  // ───── Files ─────
  // Photos and documents, up to 10 MB. The server checks the bytes again; this only spares a
  // useless upload. Files are fetched with the visitor token and shown from blob URLs.
  const MAX_FILE = 10 * 1024 * 1024;
  const ACCEPT = "image/jpeg,image/png,image/webp,image/gif,application/pdf,.pdf,.txt,.csv,.docx,.xlsx";
  const okFile = (f) => /^image\/(jpeg|png|webp|gif)$/.test(f.type) || /\.(jpe?g|png|webp|gif|pdf|txt|csv|docx|xlsx)$/i.test(f.name);
  const isImage = (a) => /^image\//.test(a.type);
  const sizeText = (n) => (n < 1024 * 1024 ? t("kb", { n: Math.max(1, Math.round(n / 1024)) }) : t("mb", { n: (n / 1048576).toFixed(1) }));
  const blobs = new Map(); // attachment id → blob URL
  function fileUrl(a) {
    if (a.local) return Promise.resolve(a.local);
    if (!blobs.has(a.id)) {
      const p = fetch(`${API}/widget/${KEY}/conversations/${session.conversation_id}/files/${a.id}`, { headers: headers(session.visitor_token), credentials: "omit" })
        .then((r) => (r.ok ? r.blob() : Promise.reject(new Error(String(r.status)))))
        .then((b) => URL.createObjectURL(b));
      p.catch(() => blobs.delete(a.id));
      blobs.set(a.id, p);
    }
    return blobs.get(a.id);
  }
  let pending = null; // { file, url } chosen and not yet sent

  const badge = h("span", { class: "badge", hidden: true });
  launcher.append(badge);
  const panel = h("section", { class: "panel", role: "dialog", "aria-label": t("chat"), hidden: true });
  const list = h("div", { class: "body", "aria-live": "polite" });
  const input = h("input", { type: "text", placeholder: t("ask"), maxlength: "2000", "aria-label": t("message"), autocomplete: "off" });
  const sendBtn = h("button", { class: "send", type: "submit", "aria-label": t("send"), disabled: true }, icon("send", 16));
  const fileInput = h("input", { type: "file", accept: ACCEPT, hidden: true, tabindex: "-1" });
  const attachBtn = h("button", { class: "attach", type: "button", "aria-label": t("attach"), title: t("attach"), onClick: () => fileInput.click() }, icon("clip", 18));
  const tray = h("div", { class: "tray", hidden: true });
  const humanBtn = h("button", { class: "human", type: "button", onClick: () => askHuman() }, icon("person", 13), t("person"));
  const newChat = h("button", { class: "linkish", type: "button", hidden: true, onClick: () => restart() }, t("newChat"));
  const status1 = h("span", { class: "sub-text" });
  const title = h("div", { class: "title" });
  const avatar = h("span", { class: "av", "aria-hidden": "true" });
  const brand = h("span", { class: "brand" }, t("powered"));

  panel.append(
    h(
      "header",
      { class: "head" },
      avatar,
      h("div", { class: "head-text" }, title, h("div", { class: "sub" }, h("span", { class: "dot", "aria-hidden": "true" }), status1)),
      h("button", { class: "icon", type: "button", "aria-label": t("minimize"), onClick: () => toggle(false) }, icon("minus"))
    ),
    list,
    h(
      "div",
      { class: "foot" },
      tray,
      h(
        "form",
        {
          class: "input",
          onSubmit: (e) => {
            e.preventDefault();
            send(input.value);
          },
        },
        attachBtn,
        input,
        sendBtn,
        fileInput
      ),
      h("div", { class: "links" }, h("span", { class: "left" }, humanBtn, newChat), brand)
    )
  );
  const canSend = () => (input.value.trim() || pending) && !sending;
  input.addEventListener("input", () => (sendBtn.disabled = !canSend()));
  fileInput.addEventListener("change", () => {
    if (fileInput.files[0]) choose(fileInput.files[0]);
    fileInput.value = "";
  });
  // A pasted screenshot or a file dropped on the chat is attached the same way.
  input.addEventListener("paste", (e) => {
    const f = e.clipboardData && e.clipboardData.files[0];
    if (f) {
      e.preventDefault();
      choose(f);
    }
  });
  panel.addEventListener("dragover", (e) => {
    if (e.dataTransfer && [...e.dataTransfer.types].includes("Files")) e.preventDefault();
  });
  panel.addEventListener("drop", (e) => {
    const f = e.dataTransfer && e.dataTransfer.files[0];
    if (f) {
      e.preventDefault();
      choose(f);
    }
  });
  function choose(f) {
    if (!okFile(f)) return showError(t("fileType"));
    if (f.size > MAX_FILE) return showError(t("fileTooBig"));
    clearPending();
    pending = { file: f, url: /^image\/(jpeg|png|webp|gif)$/.test(f.type) ? URL.createObjectURL(f) : null };
    const thumb = pending.url ? h("img", { class: "tray-img", src: pending.url, alt: "" }) : h("span", { class: "tray-ic" }, icon("file", 16));
    tray.replaceChildren(
      h("div", { class: "tray-file" }, thumb, h("span", { class: "tray-name" }, h("b", { text: f.name }), h("small", { text: sizeText(f.size) })),
        h("button", { class: "tray-x", type: "button", "aria-label": t("removeFile"), onClick: () => { clearPending(); input.focus(); } }, icon("x", 14)))
    );
    tray.hidden = false;
    sendBtn.disabled = !canSend();
    input.focus();
  }
  function clearPending(keepUrl) {
    if (pending && pending.url && !keepUrl) URL.revokeObjectURL(pending.url);
    pending = null;
    tray.hidden = true;
    tray.replaceChildren();
    sendBtn.disabled = !canSend();
  }
  panel.addEventListener("keydown", (e) => {
    if (e.key === "Escape") toggle(false);
  });

  // ───── Rendering ─────
  function sourcesEl(sources) {
    if (!sources || !sources.length) return null;
    const box = h("div", { class: "sources", hidden: true });
    for (const s of sources) {
      // Only http(s) links from our own API are rendered as links.
      const link = s.url && /^https?:\/\//i.test(s.url) ? h("a", { class: "src-name", href: s.url, target: "_blank", rel: "noopener noreferrer", text: s.name }) : h("div", { class: "src-name", text: s.name });
      box.append(h("div", { class: "src" }, link, s.heading ? h("div", { class: "src-head", text: s.heading }) : null, h("div", { class: "src-text", text: s.text })));
    }
    const btn = h("button", { class: "src-toggle", type: "button", "aria-expanded": "false" }, icon("chev", 12), t("sources", { count: sources.length }));
    btn.addEventListener("click", () => {
      const showing = box.hidden;
      box.hidden = !showing;
      btn.setAttribute("aria-expanded", String(showing));
      btn.classList.toggle("open", showing);
    });
    return h("div", { class: "src-wrap" }, btn, box);
  }

  function filesEl(files) {
    if (!files || !files.length) return null;
    return h("div", { class: "files" }, files.map((a) => {
      if (isImage(a)) {
        const img = h("img", { alt: a.name });
        fileUrl(a).then((u) => {
          const atBottom = list.scrollHeight - list.scrollTop - list.clientHeight < 40;
          img.src = u;
          img.addEventListener("load", () => atBottom && (list.scrollTop = list.scrollHeight), { once: true });
        }, () => img.replaceWith(h("span", { class: "file-broken", text: a.name })));
        return h("button", { class: "file-img", type: "button", "aria-label": t("openPhoto"), onClick: () => fileUrl(a).then((u) => window.open(u, "_blank", "noopener")) }, img);
      }
      return h("button", { class: "file-doc", type: "button", "aria-label": t("download", { name: a.name }), onClick: () => fileUrl(a).then((u) => {
        const link = h("a", { href: u, download: a.name });
        root.append(link);
        link.click();
        link.remove();
      }) }, h("span", { class: "file-ic" }, icon("file", 16)), h("span", { class: "file-name" }, h("b", { text: a.name }), h("small", { text: sizeText(a.size) })));
    }));
  }

  // An AI message can carry a card: sign in to the business's system, or confirm a change.
  function cardEl(m) {
    const c = m.card;
    if (!c) return null;
    if (c.type === "connect") {
      // Only on the latest answer: once the customer signs in, a new answer follows.
      if (messages.filter((x) => x.role === "ai").pop() !== m) return null;
      return h(
        "div",
        { class: "card" },
        h("div", { class: "card-title", text: t("signInTo", { name: c.name }) }),
        h("div", { class: "card-state", text: t("signInNote") }),
        h("div", { class: "card-actions" }, h("button", { class: "card-btn", type: "button", onClick: () => connect(c) }, icon("lock", 13), " " + t("signIn")))
      );
    }
    if (c.type === "confirm") {
      const lines = h("div", { class: "card-lines" });
      for (const [a, b] of c.lines || []) lines.append(h("span", { text: String(a) }), h("span", { text: b == null ? "" : String(b) }));
      const pending = c.status === "pending";
      const state = { done: t("confirmed"), cancelled: t("cancelled"), failed: t("failed") }[c.status];
      return h(
        "div",
        { class: "card" },
        h("div", { class: "card-title", text: c.title || t("pleaseConfirm") }),
        (c.lines || []).length ? lines : null,
        c.total ? h("div", { class: "card-total", text: String(c.total) }) : null,
        pending
          ? h(
              "div",
              { class: "card-actions" },
              h("button", { class: "card-btn", type: "button", onClick: (e) => decide(c, true, e.currentTarget) }, t("confirm")),
              h("button", { class: "card-btn ghost", type: "button", onClick: (e) => decide(c, false, e.currentTarget) }, t("cancel"))
            )
          : h("div", { class: `card-state ${c.status === "done" ? "done" : ""}`, text: state || "" })
      );
    }
    return null;
  }

  function render() {
    list.replaceChildren();
    list.append(h("div", { class: "note", text: t("note") }));
    list.append(h("div", { class: "msg bot" }, h("div", { class: "bubble", text: config.welcome })));
    if (!messages.length && config.suggestions?.length) {
      const chips = h("div", { class: "chips" });
      for (const q of config.suggestions) chips.append(h("button", { class: "chip", type: "button", text: q, onClick: () => send(q) }));
      list.append(chips);
    }
    for (const m of messages) {
      const mine = m.role === "visitor";
      const who = m.role === "human";
      list.append(
        h(
          "div",
          { class: `msg ${mine ? "me" : m.role === "human" ? "bot team" : "bot"}` },
          who ? h("div", { class: "who", text: t("team", { name: config.display_name }) }) : null,
          m.body ? h("div", { class: "bubble", text: m.body }) : null,
          filesEl(m.attachments),
          m.role === "ai" ? sourcesEl(m.sources) : null,
          m.role === "ai" ? cardEl(m) : null,
          h("span", { class: "time", text: time(m.created_at) })
        )
      );
    }
    const waiting = status === "needs_human" || status === "human";
    if (sending || thinking) list.append(h("div", { class: "typing", role: "status", "aria-label": t("typing") }, h("span"), h("span"), h("span")));
    const last = messages.filter((m) => m.role === "ai").pop();
    if (!waiting && !sending && last && last.kind === "fallback" && config.handoff) {
      list.append(h("div", { class: "chips" }, h("button", { class: "chip", type: "button", onClick: () => askHuman() }, t("person"))));
    }
    if (status === "needs_human") list.append(h("div", { class: "handoff", role: "status", text: t("handoff") }));
    status1.textContent = waiting ? (status === "human" ? t("replying") : t("waiting")) : t("agent", { name: config.name });
    humanBtn.hidden = !config.handoff || waiting;
    newChat.hidden = !session.conversation_id || !messages.length;
    sendBtn.disabled = !canSend();
    list.scrollTop = list.scrollHeight;
  }

  function showError(text) {
    list.append(h("div", { class: "error", role: "alert", text }));
    list.scrollTop = list.scrollHeight;
  }

  // ───── Behaviour ─────
  let opener = null; // what had focus before the page opened the chat, to return to
  function toggle(force) {
    const was = open;
    open = force === undefined ? !open : force;
    if (open && !was) opener = document.activeElement;
    panel.hidden = !open;
    launcher.setAttribute("aria-expanded", String(open));
    launcher.setAttribute("aria-label", open ? t("minimize") : t("chatWith", { name: config.display_name }));
    launcher.firstChild.replaceWith(icon(open ? "minus" : "chat", 24));
    host.classList.toggle("is-open", open);
    if (open) {
      unseen = 0;
      badge.hidden = true;
      render();
      setTimeout(() => input.focus(), 30);
    } else if (!NO_LAUNCHER) launcher.focus();
    else if (was && opener && opener.focus) opener.focus();
    schedulePoll();
  }

  async function ensureConversation() {
    if (session.conversation_id) return;
    const r = await call("POST", "/conversations", { page: location.pathname.slice(0, 400) });
    session = { conversation_id: r.conversation_id, visitor_token: r.visitor_token };
    save(session);
  }

  function absorb(r) {
    const known = new Set(messages.map((m) => m.id));
    const fresh = r.messages.filter((m) => !known.has(m.id));
    // A live update can bring the server's copy of a message while it's still being sent: that copy
    // replaces the one shown meanwhile, so the message never appears twice.
    for (const m of fresh) {
      if (m.role !== "visitor") continue;
      const i = messages.findIndex((x) => String(x.id).startsWith("tmp-") && x.body === (m.body || "") && (x.attachments || []).length === (m.attachments || []).length);
      if (i >= 0) messages.splice(i, 1);
    }
    messages = messages.concat(fresh);
    status = r.status;
    if (!open && fresh.some((m) => m.role !== "visitor")) {
      unseen += fresh.filter((m) => m.role !== "visitor").length;
      badge.textContent = String(unseen);
      badge.hidden = false;
    }
  }

  async function send(text) {
    const q = text.trim();
    const file = pending;
    if ((!q && !file) || sending) return;
    sending = true;
    input.value = "";
    if (file) clearPending(true);
    // Show the visitor's message right away; the server's copy replaces it.
    const local = file ? [{ id: "local", local: file.url, name: file.file.name, type: file.file.type, size: file.file.size }] : [];
    const temp = { id: `tmp-${Date.now()}`, role: "visitor", body: q, attachments: local, created_at: new Date().toISOString() };
    messages.push(temp);
    render();
    try {
      await ensureConversation();
      let body = { text: q };
      if (file) {
        body = new FormData();
        body.append("text", q);
        body.append("file", file.file, file.file.name);
      }
      const r = await call("POST", `/conversations/${session.conversation_id}/messages`, body, session.visitor_token);
      messages = messages.filter((m) => m !== temp);
      absorb(r);
      if (r.thinking) startActive();
    } catch (e) {
      messages = messages.filter((m) => m !== temp);
      input.value = q;
      if (file) choose(file.file);
      if (e.status === 404) restartSilently();
      showError(e.status === 429 ? e.message : e.status === 404 ? t("errExpired") : e.status === 413 ? t("fileTooBig") : e.status === 415 ? t("fileType") : t("errSend"));
      sending = false;
      sendBtn.disabled = !canSend();
      if (file && file.url) URL.revokeObjectURL(file.url);
      return;
    }
    sending = false;
    render();
    if (file && file.url) URL.revokeObjectURL(file.url);
    schedulePoll();
  }


  // Sign in on the business's own page in a popup. The popup must open during the click, so it
  // starts blank and gets its address once we have it.
  async function connect(c) {
    const popup = window.open("", "replybek-signin", "width=480,height=640");
    try {
      const r = await call("POST", `/conversations/${session.conversation_id}/integrations/${c.integration_id}/connect`, {}, session.visitor_token);
      if (popup) popup.location.href = r.url;
      else location.href = r.url;
    } catch (e) {
      if (popup) popup.close();
      showError(e.message);
    }
  }
  // The sign-in page tells us when it's done; the answer to the waiting question follows.
  window.addEventListener("message", (e) => {
    if (e.data && e.data.type === "replybek:connected" && e.data.ok) followUp();
  });
  function followUp() {
    const startCount = messages.filter((m) => m.role === "ai").length;
    let tries = 0;
    sending = true;
    render();
    const tick = async () => {
      await poll();
      tries += 1;
      if (messages.filter((m) => m.role === "ai").length > startCount || tries > 30) {
        sending = false;
        render();
      } else setTimeout(tick, 2000);
    };
    setTimeout(tick, 1000);
  }

  async function decide(c, confirm, btn) {
    btn.disabled = true;
    try {
      const r = await call("POST", `/conversations/${session.conversation_id}/actions/${c.action_id}/${confirm ? "confirm" : "cancel"}`, {}, session.visitor_token);
      c.status = confirm ? "done" : "cancelled";
      absorb(r);
      if (r.thinking) startActive();
      else await poll();
      render();
    } catch (e) {
      btn.disabled = false;
      showError(e.message);
    }
  }

  async function askHuman() {
    try {
      await ensureConversation();
      if (!messages.length) {
        // Leave a visible request in the transcript so the team sees what started it.
        await send(t("wantPerson"));
      }
      const r = await call("POST", `/conversations/${session.conversation_id}/handoff`, null, session.visitor_token);
      status = r.status;
      render();
      schedulePoll();
    } catch (e) {
      showError(e.message);
    }
  }

  // Runs one request the AI asked for, in this page, with the user's own session, then reports back.
  async function runToolCall(tc) {
    if (running.has(tc.id)) return;
    running.add(tc.id);
    let result = { status: 0, body: null };
    try {
      const req = tc.request || {};
      const path = String(req.path || "");
      const method = (req.method || "POST").toUpperCase();
      if (INPAGE && path.startsWith("/") && !path.startsWith("//")) {
        const target = new URL(path, location.origin);
        if (target.origin !== location.origin || target.username || target.password) throw new Error("Invalid request origin");
        const authHeaders = {};
        let credential = "", authValue = "";
        if (req.browser_auth?.provider === "host_token") {
          const provider = window.ReplybekAuth?.getToken;
          if (typeof provider !== "function") throw new Error("Host token provider is not configured");
          const header = req.browser_auth.header || "Authorization";
          if (!/^[a-zA-Z0-9-]{1,80}$/.test(header) || /^(?:cookie|host|origin|referer|content-length|connection|proxy-.*|sec-.*)$/i.test(header)) throw new Error("Invalid authentication header");
          let providerTimer;
          try {
            credential = await Promise.race([
              Promise.resolve().then(() => provider({ integrationId: tc.integration_id, method, path })),
              new Promise((_, reject) => { providerTimer = setTimeout(() => reject(new Error("Host token provider timed out")), 10000); }),
            ]);
          } finally { clearTimeout(providerTimer); }
          if (typeof credential !== "string" || !credential || credential.length > 8192 || /[\r\n]/.test(credential)) throw new Error("Host token provider returned an invalid credential");
          authValue = (req.browser_auth.prefix ?? "Bearer ") + credential;
          authHeaders[header] = authValue;
        }
        const res = await fetch(target.href, {
          method,
          headers: { "X-Requested-With": "XMLHttpRequest", ...(req.body != null && method !== "GET" ? { "Content-Type": "application/json" } : {}), ...(req.headers || {}), ...authHeaders },
          body: req.body != null && method !== "GET" ? JSON.stringify(req.body) : undefined,
          credentials: "include",
          redirect: "error",
          signal: AbortSignal.timeout(30000),
        });
        let text = await res.text();
        // Do not return an API's verbatim echo of the runtime credential to Replybek.
        if (credential) for (const value of [authValue, credential, JSON.stringify(credential).slice(1,-1), encodeURIComponent(credential)]) if (value) text = text.split(value).join("[REDACTED]");
        if (text.length > 600000) {
          // Too big to send back; the server will tell the AI to narrow the request.
          result = { status: res.status, body: { error: "response_too_large" } };
        } else {
          let body = text;
          try {
            body = text ? JSON.parse(text) : null;
          } catch {
            // Some endpoints answer with plain text or HTML.
          }
          result = { status: res.status, body };
        }
      }
    } catch {
      result = { status: 0, body: null };
    }
    try {
      await call("POST", `/conversations/${session.conversation_id}/tool-calls/${tc.id}`, result, session.visitor_token);
    } catch {
      // The result will be retried on the next poll if it's still pending.
    }
    running.delete(tc.id);
  }

  // While the AI is working, poll quickly and execute any requests it hands us, until it replies.
  function startActive() {
    thinking = true;
    syncLive();
    if (open) render();
    if (activeTimer) return;
    const startedAt = Date.now();
    const aiAtStart = messages.filter((m) => m.role === "ai").length;
    const tick = async () => {
      await poll();
      const replied = messages.filter((m) => m.role === "ai").length > aiAtStart;
      if ((replied && running.size === 0) || Date.now() - startedAt > 120000) {
        thinking = false;
        activeTimer = null;
        if (open) render();
        schedulePoll();
        return;
      }
      activeTimer = setTimeout(tick, liveUp ? 4000 : 900);
    };
    activeTimer = setTimeout(tick, 600);
  }

  // One fetch at a time; a request for another while one runs fetches once more after it.
  let polling = null;
  let pollAgain = false;
  async function poll() {
    if (polling) {
      pollAgain = true;
      return polling;
    }
    polling = (async () => {
      do {
        pollAgain = false;
        await fetchMessages();
      } while (pollAgain);
    })();
    try {
      await polling;
    } finally {
      polling = null;
    }
  }

  async function fetchMessages() {
    if (!session.conversation_id) return;
    const last = messages.filter((m) => !String(m.id).startsWith("tmp-")).pop();
    try {
      const r = await call("GET", `/conversations/${session.conversation_id}/messages${last ? `?after=${encodeURIComponent(last.created_at)}` : ""}`, null, session.visitor_token);
      const before = messages.length;
      absorb(r);
      for (const tc of r.pending || []) runToolCall(tc);
      if (open && (messages.length !== before || r.status !== status)) render();
      else if (open) render();
    } catch (e) {
      if (e.status === 404) restartSilently();
    }
  }

  // Check for teammate replies while someone is waiting. Live updates bring them the moment they're
  // sent; this poll backs them up: every 3 s with the chat open, 15 s minimized, 30 s while live.
  function schedulePoll() {
    clearTimeout(pollTimer);
    const waiting = status === "needs_human" || status === "human";
    syncLive();
    if (!session.conversation_id || !waiting) return;
    pollTimer = setTimeout(async () => {
      await poll();
      schedulePoll();
    }, liveUp ? 30000 : open ? 3000 : 15000);
  }

  // ───── Live updates ─────
  // While the chat is open or waiting for the team, one streaming request tells the widget when
  // something changed, and it fetches messages as usual. fetch, not EventSource, so the visitor
  // token travels in a header and never in a URL.
  function syncLive() {
    const want = Boolean(session.conversation_id) && (open || thinking || status === "needs_human" || status === "human");
    if (want && !live) listenLive();
    if (!want && live) stopLive();
  }
  function stopLive() {
    if (live) live.abort();
    live = null;
    liveUp = false;
  }
  async function listenLive() {
    const ctl = (live = new AbortController());
    const conv = session.conversation_id;
    let wait = 2000;
    while (live === ctl && session.conversation_id === conv) {
      try {
        const res = await fetch(`${API}/widget/${KEY}/conversations/${conv}/stream`, { headers: headers(session.visitor_token), signal: ctl.signal, credentials: "omit", cache: "no-store" });
        if (res.status === 404 || !res.body) return void (live === ctl && stopLive());
        if (!res.ok) throw new Error(String(res.status));
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = "";
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          let i;
          while ((i = buf.indexOf("\n\n")) >= 0) {
            const block = buf.slice(0, i);
            buf = buf.slice(i + 2);
            // "ready" (fetch whatever changed while connecting) or a change: either way, fetch.
            if (!/^(event|data):/m.test(block)) continue;
            if (!liveUp) {
              liveUp = true;
              schedulePoll();
            }
            wait = 2000;
            poll();
          }
        }
      } catch {
        if (ctl.signal.aborted) return;
      }
      if (live !== ctl) return;
      if (liveUp) {
        liveUp = false;
        schedulePoll(); // back to the quick poll until the stream returns
      }
      await new Promise((r) => setTimeout(r, wait));
      wait = Math.min(wait * 2, 30000);
    }
  }

  function restartSilently() {
    stopLive();
    clearPending();
    session = {};
    save(session);
    messages = [];
    status = "ai";
  }
  function restart() {
    restartSilently();
    clearTimeout(pollTimer);
    render();
    input.focus();
  }

  // ───── Start ─────
  (async function start() {
    try {
      config = await call("GET", `/config?lang=${encodeURIComponent(LANGUAGE)}`);
    } catch (e) {
      return console.warn(`[Replybek] Chat not shown: ${e.message}`);
    }
    config.suggestions = config.suggestions || [];
    host.style.setProperty("--w-accent", /^#[0-9a-f]{6}$/i.test(config.accent) ? config.accent : "#111215");
    title.textContent = config.display_name;
    avatar.textContent = initials(config.display_name);
    // The logo is a data: URL saved in the dashboard; if the host page's CSP blocks it, initials stay.
    if (/^data:image\/[\w.+-]+;base64,/.test(config.logo || "")) {
      const img = h("img", { src: config.logo, alt: "" });
      img.addEventListener("load", () => {
        avatar.textContent = "";
        avatar.classList.add("has-logo");
        avatar.append(img);
      });
    }
    brand.hidden = !config.branding;
    launcher.setAttribute("aria-label", t("chatWith", { name: config.display_name }));
    launcher.hidden = NO_LAUNCHER;
    root.append(panel, launcher);
    document.body.append(host);
    // The page can open the chat from its own button.
    window.Replybek = { open: () => toggle(true), close: () => toggle(false), toggle: () => toggle() };
    window.dispatchEvent(new CustomEvent("replybek:ready"));
    // Pick up an earlier conversation from this browser.
    if (session.conversation_id) {
      await poll();
      schedulePoll();
    }
  })();
})();
