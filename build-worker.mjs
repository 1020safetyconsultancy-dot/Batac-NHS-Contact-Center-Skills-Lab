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
      assets[path] = await readFile(full, "utf8");
    }
  }
}

await collect(root.pathname);
const worker = `const assets=${JSON.stringify(assets)};
const types={".html":"text/html; charset=utf-8",".css":"text/css; charset=utf-8",".js":"text/javascript; charset=utf-8"};
export default {async fetch(request){const url=new URL(request.url);let path=url.pathname==="/"?"/index.html":url.pathname;const body=assets[path];if(body===undefined)return new Response("Not found",{status:404});const ext=path.slice(path.lastIndexOf("."));return new Response(body,{headers:{"content-type":types[ext]||"text/plain; charset=utf-8","cache-control":"no-cache"}})}};`;
await mkdir(new URL("./dist/server/", import.meta.url), { recursive: true });
await writeFile(new URL("./dist/server/index.js", import.meta.url), worker);
