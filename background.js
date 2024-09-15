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
 * 
 * @param {string} u The URL to be updated.
 * @returns {string} The updated URL.
 */
function updateParameters(u) {
    let url = new URL(u);
    url.searchParams.delete('_sasl');

    // _sasl is the url parameter for excluded sellers on ebay.
    // _saslop=2 is the url parameter for setting _sasl to exclude sellers.
    // LH_SpecificSeller=1 is the url parameter for getting specific sellers from URL rather than from saved sellers list or the like.
    let sellers_string = list.sellers.toString();
    if (sellers_string === '') {
        url.searchParams.delete('LH_SpecificSeller');
        url.searchParams.delete('_saslop');
    } else {
        let parameters = ['LH_SpecificSeller', '_saslop'];
        let values = [1, 2];
        parameters.forEach(function(p, i) {
            if (url.searchParams.has(p)) {
                url.searchParams.set(p, values[i]);
            } else {
                url.searchParams.append(p, values[i]);
            }
        });
        url.searchParams.append('_sasl', list.sellers.toString());
    }
    return url.toString();
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
