/**
 * Captures fresh copies of the pages under test/saved_pages.
 *
 * The saved pages are served by http-server on ports 9001 (eBay) and 9002 (Amazon)
 * so that the puppeteer tests run against a fixed snapshot instead of the live sites.
 * Shopping sites redesign their search results regularly, so these need periodic
 * recapturing -- run `node test/capture-fixtures.mjs` and review the resulting diff.
 *
 * A saved page is the rendered DOM with <script> tags removed. The scripts are
 * stripped so the fixture cannot rehydrate, phone home, or otherwise mutate itself
 * out from under the content script when it is replayed from localhost.
 *
 * Pass a site name or any part of a saved path to capture a subset, e.g.
 * `node test/capture-fixtures.mjs ebay` or `node test/capture-fixtures.mjs bn_317584`.
 */
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SAVED_PAGES = path.resolve(__dirname, 'saved_pages');

const USER_AGENT =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

/**
 * The pages to capture. `file` is relative to test/saved_pages and must match the
 * path the tests request from http-server, which is the live URL with the origin
 * kept as a directory, `?` rewritten to `&`, and `.html` appended.
 */
const PAGES = [
    {
        site: 'ebay',
        url: 'https://www.ebay.com/sch/i.html?_nkw=Acer+Predator+Helios+300',
        file: 'www.ebay.com/sch/i.html&_nkw=Acer+Predator+Helios+300.html',
        expect: 'ul.srp-results li.s-card',
    },
    {
        site: 'ebay',
        url: 'https://www.ebay.com/sch/i.html?_nkw=bicycle',
        file: 'www.ebay.com/sch/i.html&_nkw=bicycle.html',
        expect: 'ul.srp-results li.s-card',
    },
    {
        site: 'ebay',
        url: 'https://www.ebay.com/b/PC-Laptops-Netbooks/177/bn_317584',
        file: 'www.ebay.com/b/PC-Laptops-Netbooks/177/bn_317584.html',
        // Category pages still use the older brwrvr layout, not the s-card one the
        // search results were migrated to.
        expect: 'ul.brwrvr__item-results li .brwrvr__item-card__wrapper',
    },
    {
        site: 'ebay',
        url: 'https://www.ebay.com/itm/266433553734',
        file: 'www.ebay.com/itm/266433553734.html',
        // The seller id is read from the _ssn parameter on the "Seller's other items"
        // link, so a capture without one cannot exercise the item page at all.
        expect: 'a[href*="_ssn="]',
    },
    {
        site: 'amazon',
        url: 'https://www.amazon.com/s?k=lenovo+legion+ideapad+gaming+laptop',
        file: 'www.amazon.com/s&k=lenovo+legion+ideapad+gaming+laptop.html',
        expect: 'div.s-result-item[data-asin]',
    },
];

/**
 * Markers that mean we were served an interstitial or an error rather than the real page.
 * Capturing one of these would bake a bot check into the test suite, so bail loudly instead.
 */
const BLOCK_MARKERS = [
    'Enter the characters you see below',
    'To discuss automated access',
    'Type the characters you see in this image',
    'Pardon Our Interruption',
    'Checking if the site connection is secure',
    'Something went wrong on our end',
    'Error Page',
];

/**
 * Both sites throttle a cold session, so a first attempt can come back as an error page.
 * Retry a few times before giving up rather than saving the error page over a good fixture.
 */
const ATTEMPTS = 3;

async function captureOnce(page, url, expect) {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

    // Search results stream in after first paint; give the list a chance to settle.
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
    await new Promise((r) => setTimeout(r, 2500));

    const title = await page.title();
    const text = await page.evaluate(() => document.body.innerText.slice(0, 3000));
    const marker = BLOCK_MARKERS.find((m) => text.includes(m) || title.includes(m));
    if (marker) throw new Error(`served an interstitial or error page ("${marker}")`);

    // A page that loads but contains no items is just as useless as an error page,
    // and much easier to commit by accident.
    if (expect) {
        const found = await page.evaluate((s) => document.querySelectorAll(s).length, expect);
        if (found === 0) throw new Error(`loaded but matched 0 elements for "${expect}"`);
        console.log(`  ${found} matches for "${expect}"`);
    }

    return page.evaluate(() => {
        const doc = document.documentElement.cloneNode(true);
        doc.querySelectorAll('script').forEach((s) => s.remove());
        return '<!DOCTYPE html>' + doc.outerHTML;
    });
}

async function capture(page, url, expect) {
    let lastError;
    for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
        try {
            return await captureOnce(page, url, expect);
        } catch (err) {
            lastError = err;
            if (attempt < ATTEMPTS) {
                console.log(`  attempt ${attempt} ${err.message}; retrying`);
                await new Promise((r) => setTimeout(r, 5000 * attempt));
            }
        }
    }
    throw lastError;
}

async function save(file, html) {
    const dest = path.join(SAVED_PAGES, file);
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.writeFile(dest, html, 'utf8');
    console.log(`  saved ${file} (${(html.length / 1024).toFixed(0)} KB)`);
}

/**
 * The seller test blocks whichever seller appears first in the bicycle results and then
 * unblocks them from their user page, so the user page fixture has to be that same seller.
 */
async function captureEbaySellerPage(page) {
    const userId = await page.evaluate(() => {
        const row = [...document.querySelectorAll('.s-card__attribute-row')].find((e) =>
            /\d+(\.\d+)?%\s*positive/i.test(e.textContent)
        );
        return row ? row.textContent.trim().split(/\s+/)[0].toLowerCase() : null;
    });
    if (!userId) throw new Error('could not read a seller id from the bicycle results');

    console.log(`  first seller in the bicycle results is "${userId}"`);
    const html = await capture(page, `https://www.ebay.com/usr/${userId}`, '.str-seller-card__store-name');
    await save(`www.ebay.com/usr/${userId}.html`, html);
    return userId;
}

const only = process.argv[2];
const browser = await puppeteer.launch({ headless: 'new', args: ['--window-size=1800,1000'] });
const page = await browser.newPage();
await page.setUserAgent(USER_AGENT);
await page.setViewport({ width: 1800, height: 1000 });

const failures = [];

for (const { site, url, file, expect } of PAGES) {
    if (only && site !== only && !file.includes(only)) continue;
    console.log(`${site}: ${url}`);
    try {
        await save(file, await capture(page, url, expect));
    } catch (err) {
        console.error(`  FAILED: ${err.message}`);
        failures.push(`${file}: ${err.message}`);
        continue;
    }

    // Done here rather than as its own PAGES entry because the seller id has to be
    // read off the bicycle results while that page is still loaded.
    if (file.includes('_nkw=bicycle')) {
        console.log('ebay: seller page for the first bicycle seller');
        try {
            await captureEbaySellerPage(page);
        } catch (err) {
            console.error(`  FAILED: ${err.message}`);
            failures.push(`seller page: ${err.message}`);
        }
    }
}

await browser.close();

if (failures.length) {
    console.error(`\n${failures.length} page(s) could not be captured:`);
    failures.forEach((f) => console.error(`  - ${f}`));
    process.exit(1);
}
console.log('\nAll pages captured.');
