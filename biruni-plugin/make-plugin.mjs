// Generates the Biruni plugin file with a backend URL and agent key baked in.
// Usage: node make-plugin.mjs <api-url> <agent-key> [out-file]
import fs from "fs";
const [api, key, out = "replybek-plugin.js"] = process.argv.slice(2);
if (!api || !key) { console.error("Usage: node make-plugin.mjs <api-url> <agent-key> [out-file]"); process.exit(1); }
const tpl = fs.readFileSync(new URL("./plugin.template.js", import.meta.url), "utf8");
fs.writeFileSync(out, tpl.replace("__REPLYBEK_API__", api.replace(/\/$/, "")).replace("__REPLYBEK_KEY__", key));
console.log(`Wrote ${out} (api ${api}, key ${key})`);
