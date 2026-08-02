import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
const canary = `service-role-canary-${randomUUID()}`;
const result = spawnSync("pnpm", ["build:web"], { cwd: new URL("..", import.meta.url), env: { ...process.env, SUPABASE_SERVICE_ROLE_KEY: canary }, shell: process.platform === "win32", stdio: "ignore" });
assert.equal(result.status, 0, "controlled canary build failed");
const root = new URL("../apps/web/.next/static/", import.meta.url);
async function files(dir){ return (await readdir(dir,{withFileTypes:true})).flatMap((entry)=>entry.isDirectory()?[]:[new URL(entry.name,dir)]); }
async function walk(dir){ const entries=await readdir(dir,{withFileTypes:true}); return (await Promise.all(entries.map((entry)=>entry.isDirectory()?walk(new URL(`${entry.name}/`,dir)):[new URL(entry.name,dir)]))).flat(); }
for (const file of await walk(root)) { const value=await readFile(file,"utf8").catch(()=>""); assert.equal(value.includes(canary),false,"service-role canary reached a static chunk"); assert.equal(value.includes("Supabase admin client cannot be used in the browser"),false,"privileged admin client reached a static chunk"); }
console.log("Admin client bundle canary: PASS");
