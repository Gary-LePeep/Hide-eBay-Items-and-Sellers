import puppeteer from "puppeteer"
import path from 'path';

async function getItemTitleByIndex(page, index) {
  return await page.evaluate((itemIndex) => {
    const item = document.querySelector(`.b-list__items_nofooter .s-item:nth-child(${itemIndex + 1})`);
    if (item) {
      const titleElement = item.querySelector('.s-item__title');
      return titleElement ? titleElement.innerText : null;
    }
    return null;
  }, index);
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
  const timeout = 10000;
  let browser, page, extensionId;

  beforeAll(async () => {
    const extensionPath = path.resolve(__dirname, '../dist');
    const isCI = process.env.CI === 'true';

    browser = await puppeteer.launch({
      headless: isCI,
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`
      ],
      devtools: !isCI
    });

    page = await browser.newPage();

    extensionId = await getChromeExtensionId(page);
  });

  it('should hide item on eBay category page when hide item clicked', async () => {
    await page.goto(`https://www.ebay.com/b/PC-Laptops-Netbooks/177/bn_317584')}`);

    // Get the number of items before clicking the hide button, and the name of the second item
    const initialItemCount = await page.evaluate(() => {
      return document.querySelectorAll('.b-list__items_nofooter .s-item').length;
    });
    const secondItemTitle = await getItemTitleByIndex(page, 1);

    // Click on the first "hide item" button
    const hideItemButtonSelector = '.hide-item-button';
    await page.waitForSelector(hideItemButtonSelector);
    await page.click(hideItemButtonSelector);

    // Get the number of items after clicking the hide button, and the name of the first item
    const currentItemCount = await page.evaluate(() => {
        return document.querySelectorAll('.b-list__items_nofooter .s-item').length;
    });
    const firstItemTitle = await getItemTitleByIndex(page, 0);

    // Assert that the number of items has decreased by 1, and the title of the first item is the same as the previously second item's title
    expect(currentItemCount).toBe(initialItemCount - 1);
    expect(secondItemTitle).toBe(firstItemTitle);
  }, timeout);

  it('should hide item on eBay search page when hide item clicked', async () => {
    await page.goto(`https://www.ebay.com/sch/i.html?_nkw=Acer+Predator+Helios+300')}`);

    // Get the number of items before clicking the hide button, and the name of the second item
    const initialItemCount = await page.evaluate(() => {
      return document.querySelectorAll('.srp-results .s-item').length;
    });
    const secondItemTitle = await getItemTitleByIndex(page, 1);

    // Click on the first "hide item" button
    const hideItemButtonSelector = '.hide-item-button';
    await page.waitForSelector(hideItemButtonSelector);
    await page.click(hideItemButtonSelector);

    // Get the number of items after clicking the hide button, and the name of the first item
    const currentItemCount = await page.evaluate(() => {
        return document.querySelectorAll('.srp-results .s-item').length;
    });
    const firstItemTitle = await getItemTitleByIndex(page, 0);

    // Assert that the number of items has decreased by 1, and the title of the first item is the same as the previously second item's title
    expect(currentItemCount).toBe(initialItemCount - 1);
    expect(secondItemTitle).toBe(firstItemTitle);
  }, timeout);

  it('should hide items from a seller blocked in easyBlockStorageObject', async () => {
    // Get the number of items in the search results and the name of the first seller
    await page.goto('https://www.ebay.com/sch/i.html?_nkw=bicycle');

    const initialItemCount = await page.evaluate(() => {
      return document.querySelectorAll('.srp-results .s-item').length;
    });

    const sellerToBlock = await page.evaluate(() => {
        const sellerInfoElement = document.querySelector('li .s-item__info .s-item__seller-info-text');
        return sellerInfoElement ? sellerInfoElement.textContent.trim().toLowerCase() : null;
    });

    const sellerToBlockName = sellerToBlock.split(" ")[0].toLowerCase();

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
    await page.goto('https://www.ebay.com/sch/i.html?_nkw=bicycle');

    // Get the number of items in the search results and whether any are from the blocked seller
    const currentItemCount = await page.evaluate(() => {
      return document.querySelectorAll('.srp-results .s-item').length;
    });

    const sellerItemsVisible = await page.evaluate((blockedSeller) => {
        const sellerItems = Array.from(document.querySelectorAll('li .s-item__info .s-item__seller-info-text'));
        return sellerItems.some(seller => seller.textContent.trim().toLowerCase() === blockedSeller);
    }, sellerToBlockName);

    // Assert that no items from the blocked seller are visible
    expect(sellerItemsVisible).toBe(false);
    expect(currentItemCount).toBeLessThan(initialItemCount);
  }, timeout);

  afterAll(async () => {
    await browser.close();
  });
});