// Replybek plugin for Biruni-based apps (Smartup: trade, anor, core, …).
// Biruni loads it automatically after login when a project's md_projects.web_plugin_file points
// at this file (served from page/resource/<project_code>/). It adds the Replybek chat to every
// page and lets the assistant run look-ups and (after the user confirms) changes in the user's
// own session — no API keys, no stored passwords, nothing sent to Smartup's servers to install.
(function () {
  var API = "__REPLYBEK_API__"; // Replybek backend base URL
  var KEY = "__REPLYBEK_KEY__"; // Replybek agent public key
  if (!API || API.indexOf("__") === 0 || !KEY || window.__replybekPlugin) return;
  window.__replybekPlugin = true;
  function inject() {
    if (document.getElementById("replybek-widget")) return;
    var s = document.createElement("script");
    s.src = API + "/widget.js?_=" + Date.now();
    s.async = true;
    s.setAttribute("data-key", KEY);
    s.setAttribute("data-api", API);
    s.setAttribute("data-inpage", "true"); // run the assistant's requests here, in this session
    document.body.appendChild(s);
  }
  if (document.body) inject();
  else document.addEventListener("DOMContentLoaded", inject);
})();
