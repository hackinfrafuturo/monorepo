import { spawn } from "node:child_process";
import net from "node:net";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const DECK_DEV_PORT = 5174;

function waitForPort(port, timeoutMs = 20000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const attempt = () => {
      const socket = net.connect({ port, host: "127.0.0.1" });
      socket.once("connect", () => {
        socket.end();
        resolve();
      });
      socket.once("error", () => {
        socket.destroy();
        if (Date.now() - start > timeoutMs) {
          reject(new Error(`Deck dev server did not open port ${port}`));
          return;
        }
        setTimeout(attempt, 100);
      });
    };
    attempt();
  });
}

const children = [];

function start(args) {
  const child = spawn("pnpm", args, {
    cwd: root,
    stdio: "inherit",
    env: process.env,
  });
  children.push(child);
  return child;
}

function shutdown(code) {
  for (const child of children) {
    if (child.exitCode === null && !child.killed) child.kill("SIGTERM");
  }
  process.exit(code);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

const deck = start(["--filter", "deck", "dev"]);
deck.on("exit", (code) => {
  if (code) shutdown(code ?? 1);
});

try {
  await waitForPort(DECK_DEV_PORT);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  shutdown(1);
}

const site = start(["exec", "vite", "dev"]);
site.on("exit", (code) => shutdown(code ?? 0));
