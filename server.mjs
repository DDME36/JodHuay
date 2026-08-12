import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('.', import.meta.url)));
const port = Number.parseInt(process.env.JODHUAY_PORT || '4173', 10);
const host = '127.0.0.1';
const mimeTypes = {
    '.css': 'text/css; charset=utf-8',
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.png': 'image/png',
    '.svg': 'image/svg+xml; charset=utf-8',
    '.webmanifest': 'application/manifest+json; charset=utf-8'
};

function openBrowser() {
    if (process.env.JODHUAY_NO_OPEN === '1') return;
    const url = `http://${host}:${port}`;
    if (process.platform === 'win32') {
        const child = spawn('cmd.exe', ['/c', 'start', '', url], {
            detached: true,
            stdio: 'ignore',
            windowsHide: true
        });
        child.unref();
    }
}

function safePath(urlPath) {
    const decoded = decodeURIComponent(urlPath.split('?')[0]);
    const relative = normalize(decoded === '/' ? 'index.html' : decoded.replace(/^\/+/, ''));
    const target = resolve(join(root, relative));
    return target === root || target.startsWith(`${root}\\`) ? target : null;
}

const server = createServer(async (request, response) => {
    try {
        const target = safePath(request.url || '/');
        if (!target || !(await stat(target)).isFile()) throw new Error('Not found');
        const content = await readFile(target);
        response.writeHead(200, {
            'Content-Type': mimeTypes[extname(target).toLowerCase()] || 'application/octet-stream',
            'Cache-Control': 'no-cache',
            'X-Content-Type-Options': 'nosniff'
        });
        response.end(content);
    } catch {
        response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        response.end('ไม่พบไฟล์');
    }
});

server.on('error', error => {
    if (error.code === 'EADDRINUSE') {
        console.log(`JodHuay ทำงานอยู่แล้วที่ http://${host}:${port}`);
        openBrowser();
        process.exit(0);
    }
    console.error(error);
    process.exit(1);
});

server.listen(port, host, () => {
    console.log(`JodHuay พร้อมใช้งาน: http://${host}:${port}`);
    console.log('กด Ctrl+C เมื่อต้องการหยุดเซิร์ฟเวอร์');
    openBrowser();
});
