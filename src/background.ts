import { ebayPattern, amazonPattern } from './content/patterns';
import {getEasyBlockStorageObject} from "./content/storage";

/**
 * A map of supported platforms and their corresponding page URL regex patterns and popups.
 */
const PAGE_REGEX_MAP: { [key: string]: RegExp } = {
    ebay: ebayPattern.base,
    amazon: amazonPattern.base,
    facebook: RegExp('^https://(.+?\\.)?facebook\\.'),
    bestbuy: RegExp('^https://(.+?\\.)?bestbuy\\.'),
    // Add more platforms here
};
const PAGE_POPUP_MAP: { [key: string]: string } = {
    ebay: 'popup/popup-ebay.html',
    amazon: 'popup/popup-amazon.html',
    facebook: 'popup/popup-facebook.html',
    bestbuy: 'popup/popup-bestbuy.html',
    // Add more platforms here
};

/**
 * Firefox kept page actions in Manifest V3, where Chromium folded them into the action
 * API. The page action is what puts the icon inside the address bar, so it is still worth
 * driving; it is feature-detected rather than sniffed for from the user agent, so it is
 * simply skipped on browsers that dropped it.
 */
const pageAction: typeof chrome.pageAction | undefined = (chrome as any).pageAction;

/**
 * Sets the appropriate popup for the tab's URL, and shows the address bar icon on the
 * sites easyBlock supports.
 */
async function handlePageAction(tabId: number, url: string) {
    const storageObject = await getEasyBlockStorageObject();
    let matchedKey: string | undefined;

    // Check for matches against the regex patterns
    for (const [key, regex] of Object.entries(PAGE_REGEX_MAP)) {
        if (regex.test(url)) {
            matchedKey = key;
            break;
        }
    }

    // Always enable the extension icon.
    // If the website is one of the supported sites, show the proper popup.
    // Otherwise, show the default popup.
    await chrome.action.enable(tabId);
    let popup: string;
    if (!matchedKey) {
        popup = 'popup/popup-default.html';
    } else if (storageObject[matchedKey]?.disabled) {
        popup = 'popup/popup-disabled.html';
    } else {
        popup = PAGE_POPUP_MAP[matchedKey];
    }
    await chrome.action.setPopup({ tabId, popup });

    // The address bar icon appears only on a supported site that has not been switched off.
    if (pageAction) {
        pageAction.setPopup({ tabId, popup });
        if (matchedKey && !storageObject[matchedKey]?.disabled) {
            pageAction.show(tabId);
        } else {
            pageAction.hide(tabId);
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
