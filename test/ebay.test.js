import puppeteer from "puppeteer"
import path from 'path';

/**
 * eBay serves two different result layouts. Search results use "s-card" markup; category
 * pages still use the older "brwrvr" markup. The tests cover both, so the selectors for
 * each live here rather than being repeated inline.
 */
const SEARCH = {
  url: 'http://localhost:9001/www.ebay.com/sch/i.html&_nkw=Acer+Predator+Helios+300.html',
  item: 'ul.srp-results > li.s-card',
  title: '.s-card__title',
};
const BICYCLE_SEARCH = { ...SEARCH, url: 'http://localhost:9001/www.ebay.com/sch/i.html&_nkw=bicycle.html' };
const CATEGORY = {
  url: 'http://localhost:9001/www.ebay.com/b/PC-Laptops-Netbooks/177/bn_317584.html',
  item: 'ul.brwrvr__item-results > li.brwrvr__item-card',
  title: '.bsig__title__text',
};
const ITEM_PAGE = 'http://localhost:9001/www.ebay.com/itm/266433553734.html';

/**
 * Thresholds used by the "hide sellers by reputation" test.
 *
 * They are chosen so each filter removes a different set of sellers from the bicycle
 * fixture, and so the two combined remove strictly more than either alone. Values that
 * happen to select the same single seller would make that assertion unfalsifiable.
 */
const MIN_RATING = '99';
const MIN_REVIEWS = '1000';

async function countItems(page, layout) {
  return page.evaluate((sel) => document.querySelectorAll(sel).length, layout.item);
}

async function getItemTitleByIndex(page, layout, index) {
  return page.evaluate(([itemSel, titleSel, i]) => {
    const item = document.querySelectorAll(itemSel)[i];
    if (!item) return null;
    const title = item.querySelector(titleSel);
    // Titles carry a trailing "Opens in a new window or tab" for screen readers.
    return title ? title.innerText.split('\n')[0].trim() : null;
  }, [layout.item, layout.title, index]);
}

/**
 * The name of the seller of the first result, as the content script reads it.
 */
async function getFirstSellerName(page, layout) {
  return page.evaluate((sel) => {
    const row = [...document.querySelectorAll(`${sel} .s-card__attribute-row`)]
      .find((e) => /%\s*positive/i.test(e.textContent));
    return row ? row.textContent.trim().split(/\s+/)[0].toLowerCase() : null;
  }, layout.item);
}

async function getVisibleSellerNames(page, layout) {
  return page.evaluate((sel) => [...document.querySelectorAll(`${sel} .s-card__attribute-row`)]
    .filter((e) => /%\s*positive/i.test(e.textContent))
    .map((e) => e.textContent.trim().split(/\s+/)[0].toLowerCase()), layout.item);
}

/**
 * Clicks the hide button belonging to a particular result.
 *
 * page.click() clicks whatever sits at the element's centre point, which is not reliably
 * that element: the saved pages load without their images, and the resulting layout can
 * put a different card's button under the cursor. Dispatching on the element itself keeps
 * the test independent of layout. The handler is delegated to an ancestor, so a native
 * click still reaches it.
 */
async function hideItemAt(page, layout, index) {
  await page.evaluate(([itemSel, i]) => {
    const item = document.querySelectorAll(itemSel)[i];
    const button = item && item.querySelector('.hide-item-button');
    if (!button) throw new Error(`no hide button on item ${i}`);
    button.click();
  }, [layout.item, index]);
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

  /** Waits for the content script to finish inserting its buttons. */
  async function loadPage(url) {
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.hide-item-button, .hide-seller-button', { timeout: 15000 });
  }

  /** Clears stored state so each test starts from the same place. */
  async function resetStorage() {
    await page.goto(`chrome-extension://${extensionId}/popup/popup-ebay.html`);
    await page.evaluate(() => new Promise((resolve) => chrome.storage.local.clear(resolve)));
  }

  /**
   * Reads the blocked seller list. This has to happen on an extension page: a content
   * script's chrome APIs live in an isolated world that page.evaluate cannot reach.
   */
  async function getBlockedSellers() {
    await page.goto(`chrome-extension://${extensionId}/popup/popup-ebay.html`);
    return page.evaluate(() => new Promise((resolve) => {
      chrome.storage.local.get(['easyBlockStorageObject'], (result) =>
        resolve(result.easyBlockStorageObject?.ebay?.sellers ?? []));
    }));
  }

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

  beforeEach(async () => {
    await resetStorage();
  });

  it('should hide item on eBay search page when hide item clicked, and unhide it via the popup', async () => {
    await loadPage(SEARCH.url);

    // Get the number of items before clicking the hide button, and the name of the second item
    const initialItemCount = await countItems(page, SEARCH);
    const initialFirstItemTitle = await getItemTitleByIndex(page, SEARCH, 0);
    const initialSecondItemTitle = await getItemTitleByIndex(page, SEARCH, 1);
    expect(initialItemCount).toBeGreaterThan(1);

    // Click on the first "hide item" button
    await hideItemAt(page, SEARCH, 0);

    // Get the number of items after clicking the hide button, and the name of the first item
    const currentItemCount = await countItems(page, SEARCH);
    const newFirstItemTitle = await getItemTitleByIndex(page, SEARCH, 0);

    // Assert that the number of items has decreased by 1, and the title of the first item is the same as the previously second item's title
    expect(currentItemCount).toBe(initialItemCount - 1);
    expect(newFirstItemTitle).toBe(initialSecondItemTitle);

    // Open the popup
    await page.goto(`chrome-extension://${extensionId}/popup/popup-ebay.html`);
    await page.click('#nav-items-tab');
    await page.waitForSelector('.list-group');

    // Expect the number of blocked items to be 1
    const initialBlockedItemCount = await page.evaluate(() => {
      return document.querySelectorAll('.list-group .list-item-link').length;
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
    await loadPage(SEARCH.url);

    const finalFirstItemTitle = await getItemTitleByIndex(page, SEARCH, 0);
    const finalItemCount = await countItems(page, SEARCH);

    // Assert that the item is back in the search results
    expect(finalFirstItemTitle).toBe(initialFirstItemTitle);
    expect(finalItemCount).toBe(initialItemCount);
  }, timeout);

  it('should hide item on eBay category page when hide item clicked', async () => {
    await loadPage(CATEGORY.url);

    // Get the number of items before clicking the hide button, and the name of the second item
    const initialItemCount = await countItems(page, CATEGORY);
    const secondItemTitle = await getItemTitleByIndex(page, CATEGORY, 1);
    expect(initialItemCount).toBeGreaterThan(1);

    // Click on the first "hide item" button
    await hideItemAt(page, CATEGORY, 0);

    // Get the number of items after clicking the hide button, and the name of the first item
    const currentItemCount = await countItems(page, CATEGORY);
    const firstItemTitle = await getItemTitleByIndex(page, CATEGORY, 0);

    // Assert that the number of items has decreased by 1, and the title of the first item is the same as the previously second item's title
    expect(currentItemCount).toBe(initialItemCount - 1);
    expect(firstItemTitle).toBe(secondItemTitle);
  }, timeout);

  it('should hide items from a seller blocked in easyBlockStorageObject, and unhide them via the user page', async () => {
    // Get the number of items in the search results and the name of the first seller
    await loadPage(BICYCLE_SEARCH.url);

    const initialItemCount = await countItems(page, BICYCLE_SEARCH);
    const sellerToBlockName = await getFirstSellerName(page, BICYCLE_SEARCH);
    expect(sellerToBlockName).toBeTruthy();

    // Go to the popup page and block the first seller
    await page.goto(`chrome-extension://${extensionId}/popup/popup-ebay.html`);
    await page.click('#nav-sellers-tab');
    await page.waitForSelector('.userid-input');
    await page.evaluate((sellerName) => {
      const inputField = document.querySelector('.userid-input');
      inputField.value = sellerName;
      inputField.dispatchEvent(new Event('input', { bubbles: true }));
    }, sellerToBlockName);
    await new Promise((r) => setTimeout(r, 500));
    await page.click('.hide-button');

    // Go back to the search page
    await loadPage(BICYCLE_SEARCH.url);

    // Get the number of items in the search results and whether any are from the blocked seller
    const currentItemCount = await countItems(page, BICYCLE_SEARCH);
    const remainingSellers = await getVisibleSellerNames(page, BICYCLE_SEARCH);

    // Assert that no items from the blocked seller are visible
    expect(remainingSellers).not.toContain(sellerToBlockName);
    expect(currentItemCount).toBeLessThan(initialItemCount);

    // Unblock them from their user page
    await loadPage(`http://localhost:9001/www.ebay.com/usr/${sellerToBlockName}.html`);
    await page.click('.hide-seller-button');
    await new Promise((r) => setTimeout(r, 500));

    // Go back to the search page
    await loadPage(BICYCLE_SEARCH.url);

    // Verify that the previously hidden seller's items are now visible
    const afterUnblockItemCount = await countItems(page, BICYCLE_SEARCH);
    const sellersAfterUnblock = await getVisibleSellerNames(page, BICYCLE_SEARCH);

    // Assert that the items from the seller are visible again
    expect(sellersAfterUnblock).toContain(sellerToBlockName);
    expect(afterUnblockItemCount).toBe(initialItemCount);
  }, timeout);

  it('should add the seller hide button on an item page and remember the seller', async () => {
    await loadPage(ITEM_PAGE);

    // The button is only added once the seller has been identified, so its presence means
    // the seller id was resolved from the page.
    expect(await page.evaluate(() => document.querySelectorAll('.hide-seller-button').length)).toBe(1);

    await page.click('.hide-seller-button');
    await new Promise((r) => setTimeout(r, 500));

    // The id comes from the _ssn parameter, not the store slug ("discountcomputerdepot"
    // rather than the display name), so that it matches what search results are keyed on.
    expect(await getBlockedSellers()).toEqual(['discountcomputerdepot']);

    // Clicking again unblocks them
    await loadPage(ITEM_PAGE);
    await page.click('.hide-seller-button');
    await new Promise((r) => setTimeout(r, 500));

    expect(await getBlockedSellers()).toEqual([]);
  }, timeout);

  it('should hide items from a seller with too few reviews or too low reviews as set in the popup', async () => {
    await loadPage(BICYCLE_SEARCH.url);

    // Get the number of items before hiding sellers
    const initialItemCount = await countItems(page, BICYCLE_SEARCH);

    /** Applies the two reputation thresholds from the popup. */
    async function applyThresholds({ rating, reviews }) {
      await page.goto(`chrome-extension://${extensionId}/popup/popup-ebay.html`);
      await page.waitForSelector('#hideLowerThanReviews');
      await page.evaluate(([r, n]) => {
        const setValue = (selector, value) => {
          const input = document.querySelector(selector);
          input.value = value;
          input.dispatchEvent(new Event('input', { bubbles: true }));
        };
        setValue('#hideLowerThanReviews', r);
        setValue('#hideFewerThanReviews', n);
      }, [rating, reviews]);
      await page.click('#submitHideLowerThanReviews');
      await page.click('#submitHideFewerThanReviews');
    }

    // Hide sellers rated below the threshold
    await applyThresholds({ rating: MIN_RATING, reviews: '0' });
    await loadPage(BICYCLE_SEARCH.url);
    const itemCountBlockedLowReviews = await countItems(page, BICYCLE_SEARCH);
    expect(itemCountBlockedLowReviews).toBeLessThan(initialItemCount);

    // Hide sellers with too few reviews instead
    await applyThresholds({ rating: '0', reviews: MIN_REVIEWS });
    await loadPage(BICYCLE_SEARCH.url);
    const itemCountBlockedFewReviews = await countItems(page, BICYCLE_SEARCH);
    expect(itemCountBlockedFewReviews).toBeLessThan(initialItemCount);

    // Both at once should hide strictly more than either on its own
    await applyThresholds({ rating: MIN_RATING, reviews: MIN_REVIEWS });
    await loadPage(BICYCLE_SEARCH.url);
    const itemCountBlockedLowAndFewReviews = await countItems(page, BICYCLE_SEARCH);
    expect(itemCountBlockedLowAndFewReviews).toBeLessThan(itemCountBlockedFewReviews);
    expect(itemCountBlockedLowAndFewReviews).toBeLessThan(itemCountBlockedLowReviews);
  }, timeout);

  afterAll(async () => {
    // Guarded because a failed launch leaves browser undefined, and the TypeError from
    // closing it buries the actual launch error in the output.
    if (browser) await browser.close();
  });
});
