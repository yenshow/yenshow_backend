/**
 * 產生 Customer Hub 用 RS256 金鑰對。
 * - 私鑰：server/secrets/crm-hub/private.pem（gitignore，勿提交）
 * - 公鑰：docs/crm-customer-hub/ys-hub-202610-public.pem（可交付 CRM）
 *
 * 用法：node scripts/generate-crm-hub-keys.js
 * 若私鑰已存在則拒絕覆寫（加 --force 才覆寫）。
 */
import { generateKeyPairSync } from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(serverRoot, "..");

const KID = "ys-hub-202610";
const privateDir = path.join(serverRoot, "secrets", "crm-hub");
const privatePath = path.join(privateDir, "private.pem");
const publicDir = path.join(repoRoot, "docs", "crm-customer-hub");
const publicPath = path.join(publicDir, `${KID}-public.pem`);

const force = process.argv.includes("--force");

if (fs.existsSync(privatePath) && !force) {
	console.error(`私鑰已存在：${privatePath}`);
	console.error("若確定要重新產生，請加上 --force（並同步更新交付給 CRM 的公鑰）。");
	process.exit(1);
}

const { privateKey, publicKey } = generateKeyPairSync("rsa", {
	modulusLength: 2048,
	publicKeyEncoding: { type: "spki", format: "pem" },
	privateKeyEncoding: { type: "pkcs8", format: "pem" }
});

fs.mkdirSync(privateDir, { recursive: true });
fs.mkdirSync(publicDir, { recursive: true });
fs.writeFileSync(privatePath, privateKey, { encoding: "utf8", mode: 0o600 });
fs.writeFileSync(publicPath, publicKey, { encoding: "utf8" });

console.log("kid:", KID);
console.log("private:", privatePath);
console.log("public:", publicPath);
console.log("說明文件請沿用 docs/crm-customer-hub/README.md（本腳本不再覆寫）。");
