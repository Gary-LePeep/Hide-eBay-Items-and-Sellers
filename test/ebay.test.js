import puppeteer from "puppeteer"
import path from 'path';

async function getItemTitleByIndex(page, index) {
  return await page.evaluate((itemIndex) => {
    // Adjust for zero-based indexing
    const item = document.querySelector(`.b-list__items_nofooter .s-item:nth-child(${itemIndex + 1})`);
    
    if (item) {
      const titleElement = item.querySelector('.s-item__title');
      return titleElement ? titleElement.innerText : null; // Return the title text or null
    }
    
    return null; // Return null if the item doesn't exist
  }, index); // Pass index as an argument to the evaluate function
}


describe('Test extension', () => {
  const timeout = 10000;
  let browser, page;

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
  });

  it('should hide item on eBay category page when hide item clicked', async () => {
    await page.goto(`https://www.ebay.com/b/PC-Laptops-Netbooks/177/bn_317584')}`);

    // Get the number of items before clicking the hide button, and the name of the second item
    const initialItemCount = await page.evaluate(() => {
      return document.querySelectorAll('.b-list__items_nofooter .s-item').length; // Count items without nesting
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

  afterAll(async () => {
    await browser.close();
  });
});