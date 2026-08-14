/**
 * Serves test/saved_pages on the ports the tests expect: 9001 for eBay, 9002 for Amazon.
 *
 * The two ports serve the same directory. They exist so that a saved page is reached at a
 * URL matching the patterns in test/patterns.ts, which is how the content script decides
 * which site it is looking at.
 *
 * Run directly (`npm run serve-fixtures`) to poke at the fixtures in a browser, or import
 * startFixtureServers() to manage them from a test harness.
 */
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SAVED_PAGES = path.resolve(__dirname, 'saved_pages');

export const PORTS = { ebay: 9001, amazon: 9002 };

function createServer() {
    return http.createServer((req, res) => {
        // The saved file names contain "&" and "=" from the original query strings, so the
        // path is taken verbatim rather than being parsed as a URL with a query.
        const requested = decodeURIComponent(req.url.split('#')[0]);
        const filePath = path.join(SAVED_PAGES, requested);

        // Keep the response inside saved_pages regardless of what the request asks for.
        if (!filePath.startsWith(SAVED_PAGES)) {
            res.writeHead(403);
            res.end('Forbidden');
            return;
        }

        // Some tests request a page without the .html the saved file carries, so fall back
        // to adding it -- the same resolution http-server did.
        const send = (data) => {
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(data);
        };
        fs.readFile(filePath, (err, data) => {
            if (!err) return send(data);
            fs.readFile(`${filePath}.html`, (fallbackErr, fallbackData) => {
                if (!fallbackErr) return send(fallbackData);
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end(`No saved page at ${requested}`);
            });
        });
    });
}

export function startFixtureServers() {
    const servers = Object.values(PORTS).map(
        (port) =>
            new Promise((resolve, reject) => {
                const server = createServer();
                server.once('error', reject);
                server.listen(port, () => resolve(server));
            })
    );
    return Promise.all(servers);
}

export async function stopFixtureServers(servers) {
    await Promise.all(servers.map((s) => new Promise((r) => s.close(r))));
}

// Only run standalone when invoked directly, so importing this does not start servers.
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
    await startFixtureServers();
    console.log(`Serving ${SAVED_PAGES}`);
    Object.entries(PORTS).forEach(([site, port]) => console.log(`  ${site}: http://localhost:${port}`));
    console.log('Press Ctrl+C to stop.');
}
