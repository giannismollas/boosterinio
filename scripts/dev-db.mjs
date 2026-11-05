// Makes sure the local `prisma dev` database answers before `next dev` starts (runs as "predev").
// `prisma dev --detach` is a background process that doesn't survive a reboot, so start it when
// it isn't answering. Does nothing when DATABASE_URL points somewhere other than this machine.
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { createConnection } from "node:net";
import { join } from "node:path";
import pg from "pg";

const NAME = process.env.PRISMA_DEV_NAME || "boosterinio";

function databaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  if (!existsSync(".env")) return null;
  const line = readFileSync(".env", "utf8")
    .split(/\r?\n/)
    .find((l) => /^\s*DATABASE_URL\s*=/.test(l));
  return line ? line.replace(/^\s*DATABASE_URL\s*=\s*/, "").trim().replace(/^["']|["']$/g, "") : null;
}

async function answers(connectionString) {
  const client = new pg.Client({ connectionString, connectionTimeoutMillis: 4000, query_timeout: 4000 });
  try {
    await client.connect();
    await client.query("select 1");
    return true;
  } catch {
    return false;
  } finally {
    await client.end().catch(() => {});
  }
}

/** Something is listening on the port (it may still be a hung database that won't answer queries). */
function listening(port) {
  return new Promise((resolve) => {
    const socket = createConnection({ host: "127.0.0.1", port, timeout: 1500 });
    const done = (open) => {
      socket.destroy();
      resolve(open);
    };
    socket.once("connect", () => done(true));
    socket.once("timeout", () => done(false));
    socket.once("error", () => done(false));
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// The project's own Prisma CLI, run with this Node (no shell, works the same on Windows).
const PRISMA_CLI = join(process.cwd(), "node_modules", "prisma", "build", "index.js");
const prisma = (args, stdio) => spawnSync(process.execPath, [PRISMA_CLI, "dev", ...args], { stdio });

const url = databaseUrl();
let target = null;
try {
  target = url ? new URL(url) : null;
} catch {
  // not a URL we understand: leave it to the app to report
}
if (!target || !["localhost", "127.0.0.1"].includes(target.hostname)) process.exit(0);

const dbPort = Number(target.port || 5432);
if (await answers(url)) {
  console.log(`[db] local database "${NAME}" is up on port ${dbPort}`);
  process.exit(0);
}

// Same ports as the first start (server, database, shadow database), so DATABASE_URL keeps working.
const start = ["--name", NAME, "--detach", "--port", String(dbPort - 1), "--db-port", String(dbPort), "--shadow-db-port", String(dbPort + 1)];
console.log(`[db] local database "${NAME}" isn't answering on port ${dbPort}; starting it…`);

// A hung instance still holds the port (and its lock file): stop it and wait for it to let go.
if (await listening(dbPort)) {
  prisma(["stop", NAME], "ignore");
  for (let i = 0; i < 20 && (await listening(dbPort)); i++) await sleep(500);
}

// The lock file can outlive the old process for a moment, so try the start a few times.
for (let attempt = 0; attempt < 4; attempt++) {
  if (attempt) await sleep(3000);
  if (prisma(start, attempt ? "ignore" : "inherit").status !== 0) continue;
  for (let i = 0; i < 30; i++) {
    if (await answers(url)) {
      console.log(`[db] local database "${NAME}" is up on port ${dbPort}`);
      process.exit(0);
    }
    await sleep(1000);
  }
}
console.error(`[db] couldn't start "${NAME}". Start it by hand: npx prisma dev ${start.join(" ")}`);
// Don't block `next dev`: pages will show the database error instead.
