/**
 * Runs the test suite with the fixture servers up.
 *
 * The tests drive a real browser against the saved pages, so those pages have to be served
 * over http -- a content script does not run on file:// URLs. Starting the servers here
 * rather than as a separate step keeps `npm test` working the same way locally and in CI,
 * on any platform.
 */
import { spawn } from 'child_process';
import { startFixtureServers, stopFixtureServers, PORTS } from './serve-fixtures.mjs';

let servers;
try {
    servers = await startFixtureServers();
} catch (err) {
    if (err.code === 'EADDRINUSE') {
        console.error(
            `Port ${err.port} is already in use. Another copy of the fixture server is ` +
                `probably still running -- stop it and try again.`
        );
        process.exit(1);
    }
    throw err;
}
console.log(`Fixture servers listening on ${Object.values(PORTS).join(', ')}`);

const jest = spawn('npx', ['jest', ...process.argv.slice(2)], {
    stdio: 'inherit',
    shell: process.platform === 'win32',
});

const code = await new Promise((resolve) => jest.on('close', resolve));
await stopFixtureServers(servers);
process.exit(code);
