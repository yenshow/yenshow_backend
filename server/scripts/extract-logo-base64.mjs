import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const svgPath = path.join(__dirname, "../../client/public/yenshow-icon.svg");
const outPath = path.join(__dirname, "../utils/yenshowLogoPngBase64.js");
const s = fs.readFileSync(svgPath, "utf8");
const m = s.match(/base64,([^"]+)/);
if (!m) throw new Error("no base64 in svg");
fs.writeFileSync(outPath, `export default ${JSON.stringify(m[1])};\n`);
