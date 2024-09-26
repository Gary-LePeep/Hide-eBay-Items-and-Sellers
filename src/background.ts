/**
 * A map of supported platforms and their corresponding page URL regex patterns.
 */
const PAGE_REGEX_MAP: { [key: string]: string } = {
    ebay: '^https://(.+?\\.)?ebay\\.',
    facebookMarketplace: '^https://(.+?\\.)?facebook\\.',
    bestbuy: '^https://(.+?\\.)?bestbuy\\.',
    // Add more platforms here
};

const PAGE_POPUP_MAP: { [key: string]: string } = {
    ebay: 'popup/popup-ebay.html', // Adjust the path
    facebookMarketplace: 'popup/popup-facebook.html', // Adjust the path
    bestbuy: 'popup/popup-bestbuy.html', // Adjust the path
    // Add more platforms here
};

/**
 * Handles page action visibility and sets the appropriate popup for all browsers.
 */
function handlePageAction(tabId: number, url: string) {
    let select_page_regex = Object.keys(PAGE_POPUP_MAP).map(key => PAGE_REGEX_MAP[key]).join('|');
    for (const [key, popup] of Object.entries(PAGE_POPUP_MAP)) {
        if (new RegExp(PAGE_REGEX_MAP[key]).test(url)) {
            console.log(`Matched ${key} with popup: ${popup}`);
            chrome.action.setPopup({ tabId, popup }); // Set the specific popup
            return; // Exit the loop once a match is found
        }
    }
    // If no match is found, use the default popup
    chrome.action.setPopup({ tabId, popup: 'popup/popup-default.html' });
}

/**
 * Set up listeners for all browsers.
 */
function setupListeners() {
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
        if (changeInfo.url) {
            handlePageAction(tabId, changeInfo.url);
        }
    });

    chrome.tabs.onActivated.addListener((activeInfo) => {
        chrome.tabs.get(activeInfo.tabId, (tab) => {
            if (tab.url) {
                handlePageAction(tab.id, tab.url);
            }
        });
    });
}

/**
 * Choose the correct setup method based on the browser type.
 */
function chooseSetupMethod() {
    // Setup listeners for all browsers
    setupListeners();
}

// Initialize page action logic
chooseSetupMethod();
