/********************************************************
 *                   Browser Storage                    *
 *******************************************************/
let easyBlockStorageObject = {
    ebay: {
        sellers: [],
        items: [],
        hideSponsored: false,
        hideSellersFewerThanReviews: 0,
        hideSellersLowerThanReviews: 0,
        base_url: '',
    }
};


/**
 * Saves the storage object to local storage.
 */
function updateStorageListBackground() {
    chrome.storage.local.set({
        easyBlockStorageObject: easyBlockStorageObject
    }, function () {
        console.log('background.js updated easyBlockStorageObject:', JSON.stringify(easyBlockStorageObject));
    });
}

/**
 * Listens for changes to the storage object, and updates it if a change is detected.
 */
chrome.storage.onChanged.addListener(function (changes, namespace) {
    for (var key in changes) {
        if (key === 'easyBlockStorageObject') {
            easyBlockStorageObject = changes[key].newValue;
        }
    }
});

/********************************************************
 *                  Page Action Popup                   *
 *******************************************************/

/**
 * Update Page Action Visibility
 * 
 * For Chrome, due to page_action being deprecated with manifest version 3 for Google Chrome,
 * a workaround is needed to update the visibility of the popup.
 * The function changes the extension button from managing the extension
 * to showing the item & seller popup as defined in popup.html.
 * 
 * For Firefox, page_action works to create an extension button in the url bar on ebay pages.
 * Likewise, action enables the extension button in the extension toolbar on ebay pages.
 * For non-ebay pages, the extension button is hidden from the url bar and disabled in the extension toolbar.
 * 
 * This function is called when the user navigates to a new page.
 * If the page is an ebay page, it enables the page action.
 * If the page is not an ebay page, it hides the page action.
 * 
 * @param {string} newUrl The URL of the new page.
 * @param {int} tabId The id of the tab that was updated.
 */

//Check if browser is Chrome
if (navigator.userAgent.search("Chrome") > 0) {
    // Wrap in an onInstalled callback in order to avoid unnecessary work
    // every time the background script is run
    chrome.runtime.onInstalled.addListener(() => {
        // Page actions are disabled by default and enabled on select tabs
        chrome.action.disable();

        // Clear all rules to ensure only our expected rules are set
        chrome.declarativeContent.onPageChanged.removeRules(undefined, () => {
            // Declare a rule to enable the action on example.com pages
            let enableOnSelectHostsRule = {
                conditions: [
                    new chrome.declarativeContent.PageStateMatcher({
                        pageUrl: { urlMatches: '^https:\/\/(.+?\.)?ebay\.' },
                    })
                ],
                actions: [new chrome.declarativeContent.ShowAction()],
            };

            // Finally, apply our new array of rules
            let rules = [enableOnSelectHostsRule];
            chrome.declarativeContent.onPageChanged.addRules(rules);
        });
    });
}
//Check if browser is Firefox 
else if (navigator.userAgent.search("Firefox") > 0) {
    function updateVisibility(url, tabId) {
        if (/^https:\/\/(.+?\.)?ebay\./.test(url)) {
            chrome.pageAction.show(tabId, function () {
                if (easyBlockStorageObject.ebay.base_url === '') {
                    let ebayURL = new URL(url.toString()).origin;
                    easyBlockStorageObject.ebay.base_url = ebayURL;
                    updateStorageListBackground();
                }
            });
            chrome.action.enable();
        } else {
            chrome.pageAction.hide(tabId);
            chrome.action.disable();
        }
    }

    chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
        updateVisibility(tab.url, tabId);
    });

    chrome.tabs.onActivated.addListener(function (activeInfo) {
        chrome.tabs.get(activeInfo.tabId, function (tab) {
            updateVisibility(tab.url, tab.id);
        });
    });
}




