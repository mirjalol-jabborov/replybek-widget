// Replybek chat widget. Usage:
//   <script src=".../replybek-widget.js" data-key="pk_…" data-api="https://api.example.com" defer></script>
// Everything renders inside a shadow root, so the host page's CSS can't affect it (and vice versa).
// Visitor text is only ever inserted with textContent, never as HTML.
import css from "./widget.css?inline";

(function () {
  const script = document.currentScript || document.querySelector('script[data-key][src*="replybek-widget"]') || document.querySelector("script[data-replybek-key]");
  const KEY = script && (script.dataset.key || script.dataset.replybekKey);
  const API = script && (script.dataset.api || "").replace(/\/$/, "");
  if (!KEY || !API) return console.warn("[Replybek] Add data-key and data-api to the widget script tag.");
  if (window.__replybekWidget) return; // pasted twice
  window.__replybekWidget = true;
  // When loaded inside the business system's own page (data-inpage), the widget can run the AI's
  // tool requests here, with the user's own session. INPAGE is the origin those requests go to.
  const INPAGE = script && (script.dataset.inpage !== undefined) ? location.origin : null;

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
    person: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    chev: '<path d="m9 18 6-6-6-6"/>',
    lock: '<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
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
  const time = (t) => new Date(t).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

  async function call(method, path, body, token) {
    const res = await fetch(`${API}/widget/${KEY}${path}`, {
      method,
      headers: { ...(body ? { "Content-Type": "application/json" } : {}), ...(token ? { "X-Visitor-Token": token } : {}), ...(INPAGE ? { "X-Replybek-Inpage": INPAGE } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw Object.assign(new Error(data.message || "Something went wrong."), { status: res.status });
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
  const running = new Set(); // in-page tool calls being executed right now

  // ───── Shell ─────
  const host = h("div", { id: "replybek-widget" });
  const root = host.attachShadow({ mode: "open" });
  root.append(h("style", { text: css }));
  const launcher = h("button", { class: "launcher", type: "button", "aria-expanded": "false", "aria-label": "Open chat", onClick: () => toggle() }, icon("chat", 24));
  const badge = h("span", { class: "badge", hidden: true });
  launcher.append(badge);
  const panel = h("section", { class: "panel", role: "dialog", "aria-label": "Chat", hidden: true });
  const list = h("div", { class: "body", "aria-live": "polite" });
  const input = h("input", { type: "text", placeholder: "Ask a question", maxlength: "2000", "aria-label": "Message", autocomplete: "off" });
  const sendBtn = h("button", { class: "send", type: "submit", "aria-label": "Send message", disabled: true }, icon("send", 16));
  const humanBtn = h("button", { class: "human", type: "button", onClick: () => askHuman() }, icon("person", 13), "Talk to a person");
  const newChat = h("button", { class: "linkish", type: "button", hidden: true, onClick: () => restart() }, "Start a new chat");
  const status1 = h("span", { class: "sub-text" });
  const title = h("div", { class: "title" });
  const avatar = h("span", { class: "av", "aria-hidden": "true" });
  const brand = h("span", { class: "brand" }, "Powered by Replybek");

  panel.append(
    h(
      "header",
      { class: "head" },
      avatar,
      h("div", { class: "head-text" }, title, h("div", { class: "sub" }, h("span", { class: "dot", "aria-hidden": "true" }), status1)),
      h("button", { class: "icon", type: "button", "aria-label": "Minimize chat", onClick: () => toggle(false) }, icon("minus"))
    ),
    list,
    h(
      "div",
      { class: "foot" },
      h(
        "form",
        {
          class: "input",
          onSubmit: (e) => {
            e.preventDefault();
            send(input.value);
          },
        },
        input,
        sendBtn
      ),
      h("div", { class: "links" }, h("span", { class: "left" }, humanBtn, newChat), brand)
    )
  );
  input.addEventListener("input", () => (sendBtn.disabled = !input.value.trim() || sending));
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
    const btn = h("button", { class: "src-toggle", type: "button", "aria-expanded": "false" }, icon("chev", 12), sources.length === 1 ? "1 source used" : `${sources.length} sources used`);
    btn.addEventListener("click", () => {
      const showing = box.hidden;
      box.hidden = !showing;
      btn.setAttribute("aria-expanded", String(showing));
      btn.classList.toggle("open", showing);
    });
    return h("div", { class: "src-wrap" }, btn, box);
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
        h("div", { class: "card-title", text: `Sign in to ${c.name}` }),
        h("div", { class: "card-state", text: "You'll sign in on their page. Your password isn't shared with this chat." }),
        h("div", { class: "card-actions" }, h("button", { class: "card-btn", type: "button", onClick: () => connect(c) }, icon("lock", 13), " Sign in"))
      );
    }
    if (c.type === "confirm") {
      const lines = h("div", { class: "card-lines" });
      for (const [a, b] of c.lines || []) lines.append(h("span", { text: String(a) }), h("span", { text: b == null ? "" : String(b) }));
      const pending = c.status === "pending";
      const state = { done: "Confirmed", cancelled: "Cancelled", failed: "Didn't go through" }[c.status];
      return h(
        "div",
        { class: "card" },
        h("div", { class: "card-title", text: c.title || "Please confirm" }),
        (c.lines || []).length ? lines : null,
        c.total ? h("div", { class: "card-total", text: String(c.total) }) : null,
        pending
          ? h(
              "div",
              { class: "card-actions" },
              h("button", { class: "card-btn", type: "button", onClick: (e) => decide(c, true, e.currentTarget) }, "Confirm"),
              h("button", { class: "card-btn ghost", type: "button", onClick: (e) => decide(c, false, e.currentTarget) }, "Cancel")
            )
          : h("div", { class: `card-state ${c.status === "done" ? "done" : ""}`, text: state || "" })
      );
    }
    return null;
  }

  function render() {
    list.replaceChildren();
    list.append(h("div", { class: "note", text: "Answers are written by AI from this business's information. A person can help if you need one." }));
    list.append(h("div", { class: "msg bot" }, h("div", { class: "bubble", text: config.welcome })));
    if (!messages.length && config.suggestions?.length) {
      const chips = h("div", { class: "chips" });
      for (const q of config.suggestions) chips.append(h("button", { class: "chip", type: "button", text: q, onClick: () => send(q) }));
      list.append(chips);
    }
    for (const m of messages) {
      const mine = m.role === "visitor";
      const who = m.role === "human" ? "Team" : null;
      list.append(
        h(
          "div",
          { class: `msg ${mine ? "me" : m.role === "human" ? "bot team" : "bot"}` },
          who ? h("div", { class: "who", text: `${config.display_name} team` }) : null,
          h("div", { class: "bubble", text: m.body }),
          m.role === "ai" ? sourcesEl(m.sources) : null,
          m.role === "ai" ? cardEl(m) : null,
          h("span", { class: "time", text: time(m.created_at) })
        )
      );
    }
    const waiting = status === "needs_human" || status === "human";
    if (sending || thinking) list.append(h("div", { class: "typing", role: "status", "aria-label": "Assistant is typing" }, h("span"), h("span"), h("span")));
    const last = messages.filter((m) => m.role === "ai").pop();
    if (!waiting && !sending && last && last.kind === "fallback" && config.handoff) {
      list.append(h("div", { class: "chips" }, h("button", { class: "chip", type: "button", onClick: () => askHuman() }, "Talk to a person")));
    }
    if (status === "needs_human") list.append(h("div", { class: "handoff", role: "status", text: "A teammate has been asked to join. They'll reply here; you can keep this page open or come back later." }));
    status1.textContent = waiting ? (status === "human" ? "A teammate is replying" : "Waiting for the team") : `${config.name} · AI assistant`;
    humanBtn.hidden = !config.handoff || waiting;
    newChat.hidden = !session.conversation_id || !messages.length;
    sendBtn.disabled = !input.value.trim() || sending;
    list.scrollTop = list.scrollHeight;
  }

  function showError(text) {
    list.append(h("div", { class: "error", role: "alert", text }));
    list.scrollTop = list.scrollHeight;
  }

  // ───── Behaviour ─────
  function toggle(force) {
    open = force === undefined ? !open : force;
    panel.hidden = !open;
    launcher.setAttribute("aria-expanded", String(open));
    launcher.setAttribute("aria-label", open ? "Minimize chat" : `Chat with ${config.display_name}`);
    launcher.firstChild.replaceWith(icon(open ? "minus" : "chat", 24));
    host.classList.toggle("is-open", open);
    if (open) {
      unseen = 0;
      badge.hidden = true;
      render();
      setTimeout(() => input.focus(), 30);
    } else launcher.focus();
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
    if (!q || sending) return;
    sending = true;
    input.value = "";
    // Show the visitor's message right away; the server's copy replaces it.
    const temp = { id: `tmp-${Date.now()}`, role: "visitor", body: q, created_at: new Date().toISOString() };
    messages.push(temp);
    render();
    try {
      await ensureConversation();
      const r = await call("POST", `/conversations/${session.conversation_id}/messages`, { text: q }, session.visitor_token);
      messages = messages.filter((m) => m !== temp);
      absorb(r);
      if (r.thinking) startActive();
    } catch (e) {
      messages = messages.filter((m) => m !== temp);
      input.value = q;
      if (e.status === 404) restartSilently();
      showError(e.status === 429 ? e.message : e.status === 404 ? "This chat expired. Please send your message again." : "Couldn't send your message. Check your connection and try again.");
      sending = false;
      sendBtn.disabled = !input.value.trim();
      return;
    }
    sending = false;
    render();
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
        await send("I'd like to talk to a person.");
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
        const res = await fetch(location.origin + path, {
          method,
          headers: { "X-Requested-With": "XMLHttpRequest", ...(req.body != null && method !== "GET" ? { "Content-Type": "application/json" } : {}), ...(req.headers || {}) },
          body: req.body != null && method !== "GET" ? JSON.stringify(req.body) : undefined,
          credentials: "include",
        });
        let text = await res.text();
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
        return;
      }
      activeTimer = setTimeout(tick, 900);
    };
    activeTimer = setTimeout(tick, 600);
  }

  async function poll() {
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

  // Check for teammate replies while someone is waiting: every 3 s with the chat open, 15 s minimized.
  function schedulePoll() {
    clearTimeout(pollTimer);
    const waiting = status === "needs_human" || status === "human";
    if (!session.conversation_id || !waiting) return;
    pollTimer = setTimeout(async () => {
      await poll();
      schedulePoll();
    }, open ? 3000 : 15000);
  }

  function restartSilently() {
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
      config = await call("GET", "/config");
    } catch (e) {
      return console.warn(`[Replybek] Chat not shown: ${e.message}`);
    }
    config.suggestions = config.suggestions || [];
    host.style.setProperty("--w-accent", /^#[0-9a-f]{6}$/i.test(config.accent) ? config.accent : "#1f3d36");
    title.textContent = config.display_name;
    avatar.textContent = initials(config.display_name);
    brand.hidden = !config.branding;
    launcher.setAttribute("aria-label", `Chat with ${config.display_name}`);
    root.append(panel, launcher);
    document.body.append(host);
    // Pick up an earlier conversation from this browser.
    if (session.conversation_id) {
      await poll();
      schedulePoll();
    }
  })();
})();
