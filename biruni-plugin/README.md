# Replybek plugin for Biruni / Smartup

Puts the Replybek chat into a Biruni-based app (Smartup's `trade`, `anor`, `core`, …) with no
change to Smartup's business logic. Biruni already loads a per-project script after login
(`biruni/app/app-session.js` → `page/resource/<project>/<file>` when `md_projects.web_plugin_file`
is set). This is that file.

## Install (per project, e.g. `trade`)
1. Build the plugin with your backend URL and agent key:
   `node make-plugin.mjs https://<your-replybek-host> <agent_public_key>`
2. Put the generated `replybek-plugin.js` at `page/resource/<project_code>/replybek-plugin.js`
   in the deployed app (shipped in a Biruni release, or copied into the running container for a pilot).
3. Set it for the project:
   `update md_projects set web_plugin_file = 'replybek-plugin.js' where project_code = '<project>'; commit;`
4. Users of that project see the chat after their next login. Remove it by clearing `web_plugin_file`.

The assistant can only do what the logged-in user can do; every change needs the user's Confirm;
every call is logged. The backend must be reachable over HTTPS from users' browsers.
