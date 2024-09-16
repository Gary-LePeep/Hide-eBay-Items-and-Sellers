/********************************************************
 *                   Browser Storage                    *
 *******************************************************/

let list = {
    sellers: [],
    items: [],
    websiteURL: ''
};

chrome.storage.local.get({
    list: list
}, function (data) {
    list = data.list;
});

/**
 * Saves the current list of hidden sellers and items to local storage.
 */
function updateStorageList() {
    chrome.storage.local.set({
        list: list
    }, function () {
        console.log('background.js updated list:');
        console.log('websiteURL: ' + list.websiteURL);
    });
}

chrome.storage.onChanged.addListener(function (changes, namespace) {
    for (var key in changes) {
        if (key === 'list') {
            list = changes[key].newValue;
        }
    }
});

/********************************************************
 *                Update URL Parameters                 *
 *******************************************************/

/**
 * Update URL Parameters
 * 
 * Updates URL parameters by reading the list of hidden sellers
 * and adding them to the URL as excluded sellers.
 * 
 * @param {string} url The URL to be updated.
 * @returns {string} The updated URL.
 */
function updateParameters(url) {
    // _sasl is the url parameter for excluded sellers on ebay.
    // _saslop=2 is the url parameter for setting _sasl to exclude sellers.
    // LH_SpecificSeller=1 is the url parameter for getting specific sellers from URL rather than from saved sellers list or the like.
    const parameters = {
        'LH_SpecificSeller': 1,
        '_saslop': 2,
        '_sasl': list.sellers.toString()
    };

    const urlObj = new URL(url);
    const searchParams = urlObj.searchParams;

    for (const key in parameters) {
        if (searchParams.has(key)) {
            searchParams.delete(key);
        }
        searchParams.append(key, parameters[key]);
    }

    return urlObj.toString();
}

// Add listener for ebay urls
// If the url is a search or category page, update the url parameters with updateParameters
chrome.webRequest.onBeforeRequest.addListener(function (details) {
    if (/^https:\/\/(www|.+?|www\..+?)\.ebay\..+?\/(sch|b)\/.+/.test(details.url)) {
        let url = updateParameters(details.url);
        if (details.url !== url) {
            return {
                redirectUrl: url
            };
        }
    }
}, {
    urls: ["https://*.ebay.com/*",
        "https://*.ebay.com.au/*",
        "https://*.ebay.at/*",
        "https://*.ebay.be/*",
        "https://*.ebay.ca/*",
        "https://*.ebay.fr/*",
        "https://*.ebay.de/*",
        "https://*.ebay.com.hk/*",
        "https://*.ebay.ie/*",
        "https://*.ebay.it/*",
        "https://*.ebay.com.my/*",
        "https://*.ebay.nl/*",
        "https://*.ebay.ph/*",
        "https://*.ebay.pl/*",
        "https://*.ebay.com.sg/*",
        "https://*.ebay.es/*",
        "https://*.ebay.ch/*",
        "https://*.ebay.co.uk/*"
    ],
    types: ['main_frame', 'sub_frame'],
}, [
    'blocking'
]);

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
                        pageUrl: {urlMatches: '^https:\/\/(www|.+?|www\..+?)\.ebay\.'},
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
        if (/^https:\/\/(www|.+?|www\..+?)\.ebay\..*/.test(url)) {
            chrome.pageAction.show(tabId, function() {
                if (list.ebayURL === '') {
                    let ebayURL = new URL(url.toString()).origin;
                    list.ebayURL = ebayURL;
                    updateStorageList();
                }
            });
            chrome.action.enable();
        } else {
            chrome.pageAction.hide(tabId);
            chrome.action.disable();
        }
    }
    
    chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
        updateVisibility(tab.url, tabId);
    });
    
    chrome.tabs.onActivated.addListener(function(activeInfo) {
        chrome.tabs.get(activeInfo.tabId, function(tab) {
            updateVisibility(tab.url, tab.id);
        });
    });
}




