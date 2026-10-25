# Replybek widget

The chat bubble businesses add to their website with one tag:

```html
<script src="https://…/replybek-widget.js" data-key="pk_…" data-api="https://api.…" defer></script>
```

- One dependency-free file (`dist/replybek-widget.js`, about 5 KB gzipped).
- Renders in a shadow root, so the website's CSS can't break it and it can't break the website.
- Visitor text is only inserted as text, never as HTML.
- Remembers the conversation in the browser (localStorage), so a page reload keeps the chat.
- While a visitor waits for the team, it checks for replies every 3 s (15 s minimized) and shows an unread badge.
- Full screen on phones; Escape minimizes; works with the keyboard.

## Try it

`npm install`, then `npm run demo`, then open
`http://localhost:5174/demo.html?key=pk_…&api=http://localhost:3100` with a published agent's key
(copy it from Settings › Widget in the dashboard). If the agent limits its allowed websites,
add `http://localhost:5174`.
