// teardown - I10's teardown can neither fail the run nor hang it (chrome-driver.js). A fake browser whose
// writer outlives its leader and goes on writing to the profile (fake-browser.mjs) stands in for Chrome's
// process tree, whose storage and network processes outlived a kill of the main process alone and made a
// release run's removal of the profile fail with ENOTEMPTY, after which the static server, never closed,
// held the run open. A Chrome killed whole also leaves the directory it made in the scratch directory for
// its singleton socket, which the teardown removes, found by the link the profile holds to it, whether
// Chrome names it with a leading dot, as Chrome 136 does, or without, as GitHub's runner's Chrome does.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import { closeServer, launchChrome, launchGroup, removeProfile, removeSingleton, serveRepository, sleep } from "./chrome-driver.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..", "..");
const fake = path.join(here, "fake-browser.mjs");
const TEST = { timeout: 30000 };

/** The live processes whose command line names the profile. */
function namingProcesses(profile) {
	try {
		return execFileSync("pgrep", ["-f", profile], { encoding: "utf8" }).trim().split("\n").filter(Boolean);
	} catch {
		return [];
	}
}

/** A fake browser started in a process group of its own, once its leader and its writer are both at work. */
async function startFake() {
	const profile = fs.mkdtempSync(path.join(os.tmpdir(), "input-capture-teardown-"));
	const browser = launchGroup(process.execPath, [fake, profile]);
	for (let i = 0; i < 400 && !(fs.existsSync(path.join(profile, "leader-ready")) && fs.existsSync(path.join(profile, "Default", "entry-1"))); i++) await sleep(25);
	assert.ok(fs.existsSync(path.join(profile, "Default", "entry-1")), "the writer is writing to the profile");
	return { profile, browser };
}

test("teardown: stopping the group ends the writer that outlives its leader, and the profile it was writing is then removed", TEST, async () => {
	const { profile, browser } = await startFake();
	try {
		assert.equal(namingProcesses(profile).length, 2, "the leader and its writer");
		assert.equal(await browser.stop(), true, "the whole group ended within the bound");
		assert.deepEqual(namingProcesses(profile), [], "no process of the group is left");
		assert.equal(removeProfile(profile), true);
		assert.equal(fs.existsSync(profile), false);
		assert.equal(await browser.stop(), true, "stopping again does nothing and never throws");
	} finally {
		try {
			process.kill(-browser.child.pid, "SIGKILL");
		} catch {
			// already gone, as it should be
		}
		fs.rmSync(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 });
	}
});

test("teardown: a profile that cannot be removed is a warning, never an exception", TEST, (t) => {
	if (process.getuid?.() === 0) {
		t.skip("root removes a directory whatever its mode");
		return;
	}
	const profile = fs.mkdtempSync(path.join(os.tmpdir(), "input-capture-teardown-"));
	const locked = path.join(profile, "Default");
	fs.mkdirSync(locked);
	fs.writeFileSync(path.join(locked, "entry"), "x");
	fs.chmodSync(locked, 0o500);
	const warnings = [];
	try {
		assert.equal(removeProfile(profile, (message) => warnings.push(message)), false);
		assert.equal(warnings.length, 1);
		assert.match(warnings[0], /^left the scratch profile .*input-capture-teardown-/);
	} finally {
		fs.chmodSync(locked, 0o700);
		fs.rmSync(profile, { recursive: true, force: true });
	}
});

test("teardown: the directory Chrome made in the scratch directory for its singleton socket, named by the profile's link, is removed -- named with a leading dot, as Chrome 136 names it, or without, as a later Chrome does; nothing else is", TEST, () => {
	const profile = fs.mkdtempSync(path.join(os.tmpdir(), "input-capture-teardown-"));
	const suffix = path.basename(profile).slice(-6);
	const elsewhere = fs.mkdtempSync(path.join(os.tmpdir(), "input-capture-teardown-other-"));
	const misnamed = fs.mkdtempSync(path.join(os.tmpdir(), "input-capture-teardown-misnamed-"));
	const made = [];
	/** A directory in the scratch directory, holding Chrome's singleton files, and the profile's link pointing into it. */
	const linked = (dir) => {
		fs.mkdirSync(dir, { recursive: true });
		made.push(dir);
		fs.writeFileSync(path.join(dir, "SingletonSocket"), "");
		fs.writeFileSync(path.join(dir, "SingletonCookie"), "");
		fs.rmSync(path.join(profile, "SingletonSocket"), { force: true });
		fs.symlinkSync(path.join(dir, "SingletonSocket"), path.join(profile, "SingletonSocket"));
		return dir;
	};
	try {
		assert.equal(removeSingleton(profile), null, "a profile with no link removes nothing");
		for (const name of [`.com.google.Chrome.${suffix}`, `com.google.Chrome.${suffix}`]) {
			const singleton = linked(path.join(os.tmpdir(), name));
			assert.equal(removeSingleton(profile), singleton, name);
			assert.equal(fs.existsSync(singleton), false, `the singleton's directory ${name} removed`);
		}
		const wrongNames = [`xcom.google.Chrome.${suffix}`, `..com.google.Chrome.${suffix}`, `com.google.Chrome.${suffix}7`, `.com.google.Chrome.${suffix}7`, `com.google.Chrome.${suffix.slice(1)}`, `com.google.Chrome.${suffix.slice(1)}-`, `com-google-Chrome.${suffix}`, `com.google.Chromium.${suffix}`];
		for (const name of wrongNames) {
			const dir = linked(path.join(os.tmpdir(), name));
			assert.equal(removeSingleton(profile), null, `${name}: not named as Chrome names it, so left`);
			assert.equal(fs.existsSync(dir), true, `${name} left`);
		}
		linked(misnamed);
		assert.equal(removeSingleton(profile), null, "a directory not named as Chrome names it is left");
		assert.equal(fs.existsSync(misnamed), true);
		for (const name of [".com.google.Chrome.abc123", "com.google.Chrome.abc123"]) {
			const dir = linked(path.join(elsewhere, name));
			assert.equal(removeSingleton(profile), null, `${name}: a directory not directly in the scratch directory is left`);
			assert.equal(fs.existsSync(dir), true);
		}
	} finally {
		for (const dir of [profile, elsewhere, misnamed, ...made]) fs.rmSync(dir, { recursive: true, force: true });
	}
});

test("teardown: a real Chrome launched and closed leaves neither its profile nor its singleton socket's directory in the scratch directory", TEST, async (t) => {
	if (typeof globalThis.WebSocket !== "function") {
		t.skip("this Node.js keeps its WebSocket behind a flag; real-chrome.test.js runs Chrome's teardown with the flag");
		return;
	}
	const before = new Set(fs.readdirSync(os.tmpdir()));
	const chrome = await launchChrome();
	const profile = chrome.profile;
	let singleton;
	try {
		singleton = path.dirname(fs.readlinkSync(path.join(profile, "SingletonSocket")));
	} finally {
		await chrome.close();
	}
	assert.equal(path.dirname(singleton), path.resolve(os.tmpdir()), "Chrome made its singleton socket's directory in the scratch directory");
	assert.equal(fs.existsSync(profile), false, "the profile removed");
	assert.equal(fs.existsSync(singleton), false, `the singleton socket's directory ${singleton} removed`);
	const left = fs.readdirSync(os.tmpdir()).filter((name) => !before.has(name) && (name.startsWith("input-capture-i10-") || name === path.basename(singleton)));
	assert.deepEqual(left, []);
});

test("teardown: closing the static server ends its kept-alive connections at once, and never throws, even twice", TEST, async () => {
	const server = await serveRepository(root);
	const agent = await fetch(`${server.origin}/test/browser/i10-page.html`, { headers: { connection: "keep-alive" } });
	assert.equal(agent.status, 200);
	await agent.text();
	const started = Date.now();
	await server.close();
	await server.close();
	assert.ok(Date.now() - started < 1500, "no kept-alive connection held the close");
	await assert.rejects(fetch(`${server.origin}/test/browser/i10-page.html`), "closed");
	await closeServer({ closeAllConnections() {
		throw new Error("a server that throws");
	}, close() {} }, 50);
});
