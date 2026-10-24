// released - the 0.1.0 release, as published, for the test beside it (CONTRACT.md I18): its tarball, the very
// file attached to the GitHub release, is kept in test/fixtures/, its SHA-512 checked against the integrity
// the release's lockfile entries pin, and its built files extracted into a scratch directory and imported, so
// both releases run side by side in one process with no dependency added and no network reached.
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import zlib from "node:zlib";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

/** The 0.1.0 release's tarball, and the integrity a consumer's lockfile records for it. */
export const RELEASED = Object.freeze({
	version: "0.1.0",
	file: path.join(root, "test", "fixtures", "apnex-input-capture-0.1.0.tgz"),
	integrity: "sha512-CWfGWhjx6zcWs4Bhqb/DpISr3by63Wm1v1zzzkK2xzpakU+ODH1QWv4utwLHhNjco3G5pyYhyWTdvsA8+ASSkQ==",
});

/** A file's integrity as npm writes it: sha512- and the digest in base64. */
export const integrityOf = (bytes) => `sha512-${crypto.createHash("sha512").update(bytes).digest("base64")}`;

/** The text of a NUL-terminated field of a tar header. */
const field = (header, start, length) => {
	const bytes = header.subarray(start, start + length);
	const end = bytes.indexOf(0);
	return bytes.subarray(0, end === -1 ? length : end).toString("utf8");
};

/** A gzipped tar's regular files, by path: the 512-byte ustar headers read in turn, a pax header's entry skipped. */
export function untar(gzipped) {
	const data = zlib.gunzipSync(gzipped);
	const files = new Map();
	for (let offset = 0; offset + 512 <= data.length; ) {
		const header = data.subarray(offset, offset + 512);
		if (header.every((byte) => byte === 0)) break;
		const name = field(header, 0, 100);
		const prefix = field(header, 345, 155);
		const size = Number.parseInt(field(header, 124, 12).trim() || "0", 8);
		const kind = header[156] === 0 ? "0" : String.fromCharCode(header[156]);
		offset += 512;
		if (kind === "0") files.set(prefix ? `${prefix}/${name}` : name, Buffer.from(data.subarray(offset, offset + size)));
		offset += Math.ceil(size / 512) * 512;
	}
	return files;
}

/**
 * The released package: its tarball checked against its integrity, its package.json and built JavaScript
 * extracted into a scratch directory, and its entry point imported. Answers the module and remove(), which
 * removes the scratch directory.
 */
export async function importReleased() {
	const bytes = fs.readFileSync(RELEASED.file);
	const integrity = integrityOf(bytes);
	if (integrity !== RELEASED.integrity) throw new Error(`the fixture ${RELEASED.file} is not the 0.1.0 release: its integrity is ${integrity}`);
	const files = untar(bytes);
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), "input-capture-released-"));
	for (const [name, content] of files) {
		if (name !== "package/package.json" && !/^package\/dist\/[\w-]+\.js$/.test(name)) continue;
		const target = path.join(dir, name.slice("package/".length));
		fs.mkdirSync(path.dirname(target), { recursive: true });
		fs.writeFileSync(target, content);
	}
	const manifest = JSON.parse(fs.readFileSync(path.join(dir, "package.json"), "utf8"));
	if (manifest.name !== "@apnex/input-capture" || manifest.version !== RELEASED.version) throw new Error(`the fixture holds ${manifest.name} ${manifest.version}`);
	const module = await import(pathToFileURL(path.join(dir, "dist", "index.js")).href);
	return { module, files, remove: () => fs.rmSync(dir, { recursive: true, force: true }) };
}
