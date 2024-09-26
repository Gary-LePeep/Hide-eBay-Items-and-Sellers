/**
 * A map of supported platforms and their corresponding page URL regex patterns.
 */
const PAGE_REGEX_MAP: { [key: string]: string } = {
    ebay: '^https://(.+?\\.)?ebay\\.',
    facebookMarketplace: '^https://(.+?\\.)?facebook\\.',
    bestbuy: '^https://(.+?\\.)?bestbuy\\.',
    // Add more platforms here
};

/**
 * Handles page action visibility for Firefox.
 */
function handlePageActionFirefox(tabId: number, url: string) {
    let select_page_regex = Object.values(PAGE_REGEX_MAP).join('|');
    if (new RegExp(select_page_regex).test(url)) {
        chrome.pageAction.show(tabId);
        chrome.action.enable(tabId);
    } else {
        chrome.pageAction.hide(tabId);
        chrome.action.disable(tabId);
    }
}

/**
 * Set up listeners for Firefox.
 */
function setupListenersFirefox() {
    // Listener for tab updates and activations in Firefox
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
        if (changeInfo.url) {
            handlePageActionFirefox(tabId, changeInfo.url);
        }
    });

    chrome.tabs.onActivated.addListener((activeInfo) => {
        chrome.tabs.get(activeInfo.tabId, (tab) => {
            if (tab.url) {
                handlePageActionFirefox(tab.id, tab.url);
            }
        });
    });

    chrome.runtime.onInstalled.addListener(() => {
        chrome.tabs.query({}, (tabs) => {
            for (let tab of tabs) {
                if (tab.url) {
                    handlePageActionFirefox(tab.id, tab.url);
                }
            }
        });
    });
}

/**
 * Set up declarative content rules for Chrome.
 */
function setupListenersChrome() {
    let select_page_regex = Object.values(PAGE_REGEX_MAP).join('|');

    chrome.runtime.onInstalled.addListener(() => {
        chrome.action.disable();

        chrome.declarativeContent.onPageChanged.removeRules(undefined, () => {
            let rules = [
                {
                    conditions: [
                        new chrome.declarativeContent.PageStateMatcher({
                            pageUrl: { urlMatches: select_page_regex },
                        }),
                    ],
                    actions: [new chrome.declarativeContent.ShowAction()],
                },
            ];

            chrome.declarativeContent.onPageChanged.addRules(rules);
        });
    });
}

/**
 * Choose the correct page action method based on the browser type.
 */
function choosePageAction() {
    // Check if the browser is Chrome
    if (navigator.userAgent.includes("Chrome")) {
        setupListenersChrome();
    }
    // Check if the browser is Firefox
    else if (navigator.userAgent.includes("Firefox")) {
        setupListenersFirefox();
    }
}

// Initialize page action logic
choosePageAction();
