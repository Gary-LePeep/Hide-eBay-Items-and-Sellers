import puppeteer from "puppeteer"
import path from 'path';

describe('Test extension on saved HTML', () => {
  const timeout = 600000;
  let browser, page;

  beforeAll(async () => {
    const extensionPath = path.resolve(__dirname, '../dist');

    browser = await puppeteer.launch({
      headless: false,
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`
      ],
      devtools: true
    });

    page = await browser.newPage();

    // Listen for console events and print them
    page.on('console', msg => {
      for (let i = 0; i < msg.args().length; ++i) {
        console.warn(`${i}: ${msg.args()[i]}`);
      }
    });
  });

  it('should hide sellers on eBay search page', async () => {
    // Load the saved eBay search HTML file
    await page.goto(`https://www.ebay.com/b/Acer-Predator-Helios-300-PC-Notebooks-Laptops/177/bn_97981221')}`);

    // Get the number of items before clicking the hide button
    const initialItemCount = await page.evaluate(() => {
      return document.querySelectorAll('.brwrvr__item-card').length; // Count items without nesting
    });

    // Click on the first "hide item" button
    const hideItemButtonSelector = '.hide-item-button'; // Adjust this selector if needed
    await page.waitForSelector(hideItemButtonSelector); // Wait for the button to be available
    await page.click(hideItemButtonSelector); // Simulate clicking the button

    // Check if the first item has been removed
    const currentItemCount = await page.evaluate(() => {
        return document.querySelectorAll('.brwrvr__item-card').length; // Count items after the click
    });

    // Assert that the number of items has decreased
    expect(currentItemCount).toBeLessThan(initialItemCount);

    // Optionally, assert that the first item is not present anymore
    const firstItemRemoved = await page.evaluate(() => {
        const firstItem = document.querySelector('.brwrvr__item-card'); // Select the first item
        return !firstItem; // Check if the first item is null (removed)
    });

    expect(firstItemRemoved).toBe(true);
  }, timeout);

  afterAll(async () => {
    await browser.close();
  });
});