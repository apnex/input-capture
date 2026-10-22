// chrome-driver - headless Chrome driven over the DevTools protocol, for I10 (CONTRACT.md; INPUT-CAPTURE.md
// section 7): no dependency, the protocol spoken over Node.js's global WebSocket.
//
// Chrome is $CHROME, or google-chrome on PATH, launched as the consumer test launches it, headless with a
// profile of its own in a scratch directory and a debugging port of its own -- port 0, so Chrome chooses
// a free one and writes it to DevToolsActivePort in that profile -- so it never touches another Chrome on
// the machine. A static server answers the repository's files, so the page loads the built package
// through an import map.
import { spawn } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";

const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".map": "application/json" };
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** A static server of the repository's test/browser/ and dist/ files, on a port of its own. */
export async function serveRepository(root) {
	const server = http.createServer((req, res) => {
		const url = new URL(req.url, "http://localhost");
		const rel = decodeURIComponent(url.pathname).replace(/^\/+/, "");
		const file = path.resolve(root, rel);
		const allowed = [path.join(root, "dist") + path.sep, path.join(root, "test", "browser") + path.sep].some((dir) => file.startsWith(dir));
		if (!allowed || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
			res.writeHead(404, { "content-type": "text/plain" });
			res.end("not found");
			return;
		}
		res.writeHead(200, { "content-type": TYPES[path.extname(file)] ?? "text/plain", "cache-control": "no-store" });
		res.end(fs.readFileSync(file));
	});
	await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
	return { origin: `http://127.0.0.1:${server.address().port}`, close: () => new Promise((resolve) => server.close(resolve)) };
}

/** Launches headless Chrome with a profile and a debugging port of its own, and connects to its first page. */
export async function launchChrome() {
	const profile = fs.mkdtempSync(path.join(os.tmpdir(), "input-capture-i10-"));
	const chrome = spawn(process.env.CHROME || "google-chrome", ["--headless=new", "--no-sandbox", "--disable-gpu", "--no-first-run", "--no-default-browser-check", "--disable-extensions", "--window-size=800,600", `--user-data-dir=${profile}`, "--remote-debugging-port=0", "about:blank"], { stdio: "ignore" });
	let exited = null;
	chrome.on("exit", (code, signal) => (exited = { code, signal }));
	const stop = async () => {
		if (exited === null) chrome.kill("SIGKILL");
		for (let i = 0; i < 50 && exited === null; i++) await sleep(20);
		fs.rmSync(profile, { recursive: true, force: true });
	};
	try {
		let port = null;
		for (let i = 0; i < 300 && port === null; i++) {
			if (exited !== null) throw new Error(`Chrome exited before it listened: ${JSON.stringify(exited)}`);
			try {
				port = Number(fs.readFileSync(path.join(profile, "DevToolsActivePort"), "utf8").split("\n")[0]) || null;
			} catch {
				await sleep(50);
			}
		}
		if (port === null) throw new Error("Chrome wrote no DevToolsActivePort");
		let target;
		for (let i = 0; i < 100 && !target; i++) {
			try {
				target = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((t) => t.type === "page");
			} catch {
				await sleep(50);
			}
		}
		if (!target) throw new Error("Chrome showed no page target");
		const session = await connect(target.webSocketDebuggerUrl);
		return { ...session, close: async () => (session.socket.close(), await stop()) };
	} catch (error) {
		await stop();
		throw error;
	}
}

/** A DevTools protocol session over Node.js's global WebSocket: send(method, params) answers the result, or throws the protocol's error. */
async function connect(url) {
	const socket = new WebSocket(url);
	await new Promise((resolve, reject) => {
		socket.addEventListener("open", resolve, { once: true });
		socket.addEventListener("error", () => reject(new Error(`could not connect to ${url}`)), { once: true });
	});
	let next = 0;
	const pending = new Map();
	socket.addEventListener("message", (message) => {
		const data = JSON.parse(String(message.data));
		const waiting = data.id === undefined ? undefined : pending.get(data.id);
		if (!waiting) return;
		pending.delete(data.id);
		if (data.error) waiting.reject(new Error(`${waiting.method}: ${data.error.message}`));
		else waiting.resolve(data.result);
	});
	const send = (method, params = {}) =>
		new Promise((resolve, reject) => {
			const id = ++next;
			const timer = setTimeout(() => {
				pending.delete(id);
				reject(new Error(`${method}: no answer in 15 seconds`));
			}, 15000);
			pending.set(id, { method, resolve: (v) => (clearTimeout(timer), resolve(v)), reject: (e) => (clearTimeout(timer), reject(e)) });
			socket.send(JSON.stringify({ id, method, params }));
		});
	/** Evaluates an expression in the page, answering its value. */
	const evaluate = async (expression) => {
		const { result, exceptionDetails } = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
		if (exceptionDetails) throw new Error(`the page threw: ${exceptionDetails.exception?.description ?? exceptionDetails.text}`);
		return result.value;
	};
	return { socket, send, evaluate };
}

export { sleep };
