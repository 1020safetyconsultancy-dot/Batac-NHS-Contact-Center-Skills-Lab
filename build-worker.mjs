import { readFile, readdir, mkdir, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";

const root = new URL("./dist/", import.meta.url);
const assets = {};

async function collect(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) await collect(full);
    else {
      const path = "/" + relative(root.pathname, full).replaceAll("\\\\", "/");
      const ext = path.slice(path.lastIndexOf("."));
      const binary = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".svg"].includes(ext);
      const data = await readFile(full);
      assets[path] = { body: binary ? data.toString("base64") : data.toString("utf8"), binary, ext };
    }
  }
}

await collect(root.pathname);
const worker = `const assets=${JSON.stringify(assets)};
const types={".html":"text/html; charset=utf-8",".css":"text/css; charset=utf-8",".js":"text/javascript; charset=utf-8",".png":"image/png",".jpg":"image/jpeg",".jpeg":"image/jpeg",".gif":"image/gif",".webp":"image/webp",".svg":"image/svg+xml",".ico":"image/x-icon"};
function decode(value){const raw=atob(value),bytes=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);return bytes}
export default {async fetch(request){const url=new URL(request.url);let path=url.pathname==="/"?"/index.html":url.pathname;const item=assets[path];if(item===undefined)return new Response("Not found",{status:404});const body=item.binary?decode(item.body):item.body;return new Response(body,{headers:{"content-type":types[item.ext]||"application/octet-stream","cache-control":"no-cache"}})}};`;
await mkdir(new URL("./dist/server/", import.meta.url), { recursive: true });
await writeFile(new URL("./dist/server/index.js", import.meta.url), worker);
