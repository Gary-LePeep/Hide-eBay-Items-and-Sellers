import { ebayPattern } from './content/patterns';

/**
 * A map of supported platforms and their corresponding page URL regex patterns and popups.
 */
const PAGE_REGEX_MAP: { [key: string]: RegExp } = {
    ebay: ebayPattern.base,
    facebookMarketplace: RegExp('^https://(.+?\\.)?facebook\\.'),
    bestbuy: RegExp('^https://(.+?\\.)?bestbuy\\.'),
    // Add more platforms here
};
const PAGE_POPUP_MAP: { [key: string]: string } = {
    ebay: 'popup/popup-ebay.html',
    facebookMarketplace: 'popup/popup-facebook.html',
    bestbuy: 'popup/popup-bestbuy.html',
    // Add more platforms here
};

/**
 * Handles page action visibility and sets the appropriate popup for all browsers.
 */
function handlePageAction(tabId: number, url: string) {
    let matchedKey: string | undefined;

    // Check for matches against the regex patterns
    for (const [key, regex] of Object.entries(PAGE_REGEX_MAP)) {
        if (regex.test(url)) {
            matchedKey = key;
            break;
        }
    }

    // Always enable the extension icon.
    // If the website is one of the supported sites, show the proper popup and enable page action (only relevant for firefox).
    // Otherwise, show the default popup and disable page action (only relevant for firefox).
    chrome.action.enable(tabId);
    if (matchedKey) {
        chrome.action.setPopup({ tabId, popup: PAGE_POPUP_MAP[matchedKey] });
        if (navigator.userAgent.search("Firefox") > 0) {
            chrome.pageAction.show(tabId);
            chrome.pageAction.setPopup({ tabId, popup: PAGE_POPUP_MAP[matchedKey] });
        }
    } else {
        chrome.action.setPopup({ tabId, popup: 'popup/popup-default.html' });
        if (navigator.userAgent.search("Firefox") > 0) {
            chrome.pageAction.hide(tabId);
            chrome.pageAction.setPopup({ tabId, popup: 'popup/popup-default.html' });
        }
    }
}

/**
 * Set up listeners for all browsers.
 */
function setupListeners() {
    // Listener for tab updates
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
        if (changeInfo.status === 'complete' && tab.url) {
            handlePageAction(tabId, tab.url);
        }
    });

    // Listener for tab activations
    chrome.tabs.onActivated.addListener((activeInfo) => {
        chrome.tabs.get(activeInfo.tabId, (tab) => {
            if (tab.url) {
                handlePageAction(tab.id, tab.url);
            }
        });
    });

    // Initial setup when the extension is installed
    chrome.runtime.onInstalled.addListener(() => {
        chrome.tabs.query({}, (tabs) => {
            for (let tab of tabs) {
                if (tab.url) {
                    handlePageAction(tab.id, tab.url);
                }
            }
        });
    });
}

/**
 * Run the setup listeners.
 */
setupListeners();
