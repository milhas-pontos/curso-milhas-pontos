const http = require("http");
const fs = require("fs");
const path = require("path");
const config = require("./serve.json");

const PORT = Number(process.env.PORT) || 3000;
const ROOT = process.cwd();

const MIME = {
	".html": "text/html; charset=utf-8",
	".css": "text/css; charset=utf-8",
	".js": "text/javascript; charset=utf-8",
	".json": "application/json; charset=utf-8",
	".svg": "image/svg+xml",
	".png": "image/png",
	".jpg": "image/jpeg",
	".jpeg": "image/jpeg",
	".webp": "image/webp",
	".gif": "image/gif",
	".ico": "image/x-icon",
	".woff2": "font/woff2",
	".txt": "text/plain; charset=utf-8",
};

const NO_CACHE_HEADERS = {
	"Cache-Control": "no-cache, no-store, must-revalidate",
	Pragma: "no-cache",
	Expires: "0",
};

function decodePath(pathname) {
	try {
		return decodeURIComponent(pathname);
	} catch {
		return null;
	}
}

function route(pathname) {
	const decoded = decodePath(pathname);
	if (decoded === null) return { error: 400 };

	if (
		decoded === "/src/slides" ||
		decoded === "/src/slides/" ||
		decoded === "/src/slides/index.html"
	) {
		return { redirect: "/slides/" };
	}

	if (decoded === "/slides" || decoded === "/slides/") {
		return { path: "/src/slides/index.html" };
	}

	if (decoded.startsWith("/slides/")) {
		return { path: `/src${decoded}` };
	}

	const rewrite = (config.rewrites || []).find((item) => item.source === decoded);
	return { path: rewrite ? rewrite.destination : decoded };
}

function insideRoot(resolved) {
	const relative = path.relative(ROOT, resolved);
	return (
		relative === "" ||
		(!relative.startsWith("..") && !path.isAbsolute(relative))
	);
}

function resolvePublic(urlPath) {
	const decoded = decodePath(urlPath);
	if (decoded === null || !decoded.startsWith("/")) return null;
	const resolved = path.resolve(ROOT, `.${decoded}`);
	return insideRoot(resolved) ? resolved : null;
}

function applyNoCache(response) {
	for (const [name, value] of Object.entries(NO_CACHE_HEADERS)) {
		response.setHeader(name, value);
	}
}

async function listDirectory(dir) {
	const names = await fs.promises.readdir(dir);
	const files = [];
	for (const name of names) {
		if (name.startsWith(".")) continue;
		const stat = await fs.promises.lstat(path.join(dir, name));
		const directory = stat.isDirectory();
		files.push({
			type: directory ? "folder" : "file",
			name,
			base: directory ? `${name}/` : name,
		});
	}
	return files;
}

function sendFile(response, filePath) {
	const type = MIME[path.extname(filePath).toLowerCase()] || "application/octet-stream";
	response.writeHead(200, { "Content-Type": type });
	fs.createReadStream(filePath)
		.on("error", () => {
			if (!response.headersSent) response.writeHead(500);
			response.end();
		})
		.pipe(response);
}

async function serve(response, urlPath, accept) {
	const resolved = resolvePublic(urlPath);
	if (!resolved) {
		response.writeHead(403);
		response.end("Forbidden");
		return;
	}

	let stat;
	try {
		stat = await fs.promises.stat(resolved);
	} catch {
		response.writeHead(404);
		response.end("Not Found");
		return;
	}

	if (stat.isDirectory()) {
		if (String(accept).includes("application/json")) {
			const files = await listDirectory(resolved);
			response.writeHead(200, {
				"Content-Type": "application/json; charset=utf-8",
			});
			response.end(JSON.stringify({ files }));
			return;
		}
		return serve(response, `${urlPath.replace(/\/$/, "")}/index.html`, "");
	}

	sendFile(response, resolved);
}

const server = http.createServer((request, response) => {
	applyNoCache(response);

	const url = new URL(request.url, "http://127.0.0.1");
	const mapped = route(url.pathname);

	if (mapped.error) {
		response.writeHead(mapped.error);
		response.end("Bad Request");
		return;
	}

	if (mapped.redirect) {
		response.writeHead(302, { Location: mapped.redirect });
		response.end();
		return;
	}

	serve(response, mapped.path, request.headers.accept).catch((err) => {
		console.error(err);
		if (!response.headersSent) {
			response.writeHead(500);
			response.end("Internal Server Error");
		}
	});
});

server.listen(PORT, () => {
	console.log(`http://localhost:${PORT}`);
});
