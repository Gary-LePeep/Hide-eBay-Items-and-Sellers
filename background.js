let list = {
    sellers: [],
    items: [],
    websiteURL: ''
};

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
    const urlObj = new URL(url);
    const searchParams = urlObj.searchParams;
    searchParams.delete('_sasl');

    const sellersString = list.sellers.toString();
    if (sellersString === '') {
        searchParams.delete('LH_SpecificSeller');
        searchParams.delete('_saslop');
    } else {
        const parameters = ['LH_SpecificSeller', '_saslop'];
        const values = [1, 2];

        parameters.forEach((parameter, i) => {
            if (searchParams.has(parameter)) {
                searchParams.set(parameter, values[i]);
            } else {
                searchParams.append(parameter, values[i]);
            }
        });
        searchParams.append('_sasl', sellersString);
    }
    return urlObj.toString();
}


/**
 * Update Page Action Visibility
 * 
 * This function is called when the user navigates to a new page.
 * If the page is an ebay page, it shows the page action.
 * If the page is not an ebay page, it hides the page action.
 * @param {string} url The URL of the new page.
 * @param {int} tabId The id of the tab that was updated.
 */
function updateVisibility(url, tabId) {
    if (/^https:\/\/(www|.+?|www\..+?)\.ebay\..*/.test(url)) {
        chrome.pageAction.show(tabId, function() {
            if (list.websiteURL === '') {
                let websiteURL = new URL(url.toString()).origin;
                list.websiteURL = websiteURL;
                updateStorageList();
            }
        });
    } else {
        chrome.pageAction.hide(tabId);
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

chrome.storage.local.get({
    list: list
}, function(data) {
    list = data.list;
});

/**
 * Saves the current list of hidden sellers and items to local storage.
 */
function updateStorageList() {
    chrome.storage.local.set({
        list: list
    }, function() {
        console.log('background.js updated list:');
        console.log('websiteURL: ' + list.websiteURL);
    });
}

chrome.storage.onChanged.addListener(function(changes, namespace) {
    for (var key in changes) {
        if (key === 'list') {
            list = changes[key].newValue;
        }
    }
});

chrome.webRequest.onBeforeRequest.addListener(function(details) {
    if (/^https:\/\/(www|.+?|www\..+?)\.ebay\..+?\/(sch|b)\/.+/.test(details.url)) {
        //if (list.sellers.length) {
            let url = updateParameters(details.url);
            if (details.url !== url) {
                console.log('updating url...');
                return {
                    redirectUrl: url
                };
            }
        //}
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
