import puppeteer from "puppeteer"
import path from 'path';

async function getItemTitleByIndex(page, index) {
  return await page.evaluate((itemIndex) => {
    const item = document.querySelector(`div.s-result-list div.s-result-item:nth-child(${itemIndex + 4})`);
    if (item) {
      const titleElement = item.querySelector('span.a-text-normal');
      return titleElement ? titleElement.innerText : null;
    }
    return null;
  }, index);
}

/**
 * Keeps the tests off the network.
 *
 * The saved pages still reference the sites' own images, stylesheets and ad trackers,
 * hundreds of them per page. Left alone every navigation waits on requests that hang on a
 * CI runner, which is what made page.goto time out there, and the suite quietly talks to
 * ad networks on every run.
 */
async function blockExternalRequests(page) {
  await page.setRequestInterception(true);
  page.on('request', (request) => {
    const url = request.url();
    if (!url.startsWith('http') || url.startsWith('http://localhost:')) {
      request.continue();
    } else {
      request.abort();
    }
  });
}

async function getChromeExtensionId(page) {
  await page.goto('chrome://extensions/');

  return await page.evaluate(() => {
    const firstShadowHost = document.querySelector('extensions-manager');
    const firstShadowRoot = firstShadowHost.shadowRoot;
    const secondShadowHost = firstShadowRoot.querySelector('extensions-item-list');
    const secondShadowRoot = secondShadowHost.shadowRoot;

    const extensionItem = secondShadowRoot.querySelector('extensions-item');
    return extensionItem ? extensionItem.id : null;
  });
}


describe('Test extension in Chrome', () => {
  const timeout = 60000;
  let browser, page, extensionId;

  beforeAll(async () => {
    const extensionPath = path.resolve(__dirname, '../dist');
    const isCI = process.env.CI === 'true';

    browser = await puppeteer.launch({
      headless: isCI,
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
        '--window-size=1800,720',
        // Ubuntu 23.10+, which includes GitHub's ubuntu-latest runners, blocks
        // unprivileged user namespaces with AppArmor, so Chrome cannot start its
        // sandbox and every launch fails. These tests only ever load the saved pages
        // from localhost, so giving up the sandbox on CI does not expose anything.
        ...(isCI ? ['--no-sandbox', '--disable-setuid-sandbox'] : []),
      ],
      devtools: !isCI
    });

    page = await browser.newPage();
    await blockExternalRequests(page);

    extensionId = await getChromeExtensionId(page);
  });

  it('should hide item on eBay search page when hide item clicked, and unhide it via the popup', async () => {
    await page.goto(`http://localhost:9002/www.amazon.com/s&k=lenovo+legion+ideapad+gaming+laptop`, { waitUntil: 'domcontentloaded' });

    // Get the number of items before clicking the hide button, and the name of the second item
    const initialItemCount = await page.evaluate(() => {
      return document.querySelectorAll('div.s-result-list div.s-result-item').length;
    });
    const initialFirstItemTitle = await getItemTitleByIndex(page, 0);
    const initialSecontItemTitle = await getItemTitleByIndex(page, 1);

    // Click on the first "hide item" button
    const hideItemButtonSelector = '.hide-item-button';
    await page.waitForSelector(hideItemButtonSelector);
    await page.click(hideItemButtonSelector);

    // Get the number of items after clicking the hide button, and the name of the first item
    const currentItemCount = await page.evaluate(() => {
        return document.querySelectorAll('div.s-result-list div.s-result-item').length;
    });
    const newFirstItemTitle = await getItemTitleByIndex(page, 0);

    // Assert that the number of items has decreased by 1, and the title of the first item is the same as the previously second item's title
    expect(currentItemCount).toBe(initialItemCount - 1);
    expect(initialSecontItemTitle).toBe(newFirstItemTitle);

    // Open the popup
    await page.goto(`chrome-extension://${extensionId}/popup/popup-amazon.html`);
    await page.click('#nav-items-tab');
    await page.waitForSelector('.list-group');

    // Expect the number of blocked items to be 1
    const initialBlockedItemCount = await page.evaluate(() => {
      return document.querySelectorAll('.list-group .list-item-link').length; // Adjust this selector based on your HTML structure
    });
    expect(initialBlockedItemCount).toBe(1);


    // Click the remove button for the first blocked item
    await page.evaluate(() => {
      const removeButton = document.querySelector('.list-group .remove-button');
      const event = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        view: window,
      });
      removeButton.dispatchEvent(event);
    });

    // Go back to the search page and verify that everything is back to the way it was before
    await page.goto(`http://localhost:9002/www.amazon.com/s&k=lenovo+legion+ideapad+gaming+laptop`, { waitUntil: 'domcontentloaded' });

    const finalFirstItemTitle = await getItemTitleByIndex(page, 0);
    const finalItemCount = await page.evaluate(() => {
      return document.querySelectorAll('div.s-result-list div.s-result-item').length;
    });

    // Assert that the item is back in the search results
    expect(finalFirstItemTitle).toBe(initialFirstItemTitle);
    expect(finalItemCount).toBe(initialItemCount);
  }, timeout);

  afterAll(async () => {
    // Guarded because a failed launch leaves browser undefined, and the TypeError from
    // closing it buries the actual launch error in the output.
    if (browser) await browser.close();
  });
});