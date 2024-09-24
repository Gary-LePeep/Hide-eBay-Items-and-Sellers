/********************************************************
 *                   Browser Storage                    *
 *******************************************************/

let contentStorageObject = {
    webpage: "",
    ebay: {
        sellers: [],
        items: [],
        hideSponsored: false,
        hideSellersFewerThanReviews: 0,
        hideSellersLowerThanReviews: 0,
        base_url: "",
    },
};

/**
 * Retrieves the storage object from local storage.
 */
chrome.storage.local.get(
    {
        easyBlockStorageObject: contentStorageObject,
    },
    function (data) {
        contentStorageObject = data.easyBlockStorageObject;
        console.warn('content.js retrieved contentStorageObject', JSON.stringify(contentStorageObject));
        processWebpage();
    }
);

/**
 * Saves the storage object to local storage.
 */
function updateStorageList() {
    chrome.storage.local.set(
        {
            easyBlockStorageObject: contentStorageObject,
        },
        function () {
            console.log("content.js updated contentStorageObject:", JSON.stringify(contentStorageObject));
        }
    );
}

/**
 * Listens for changes to the storage object, and updates it if a change is detected.
 */
chrome.storage.onChanged.addListener(function (changes, namespace) {
    for (var key in changes) {
        if (key === "easyBlockStorageObject") {
            contentStorageObject = changes[key].newValue;
        }
    }
});

/********************************************************
 *                   Process Webpage                    *
 *******************************************************/

/**
 * Process Webpage
 *
 * This function checks the url for one of the following subdirectories:
 * Ebay:
 *   `sch` or `b`: This is a search or category page.
 *   `itm` or `p`: This is a page for an item or category-item.
 *   `usr` or `str`: This is the page of a user.
 * Depending on which type of page it is, process that type of webpage.
 */
function processWebpage() {
    contentStorageObject.webpage = window.location.origin;
    updateStorageList();
    if (/^https:\/\/(.+?\.)?ebay\./.test(window.location.origin)) {
        contentStorageObject.ebay.base_url = window.location.origin;
        import(chrome.runtime.getURL('src/content/content-ebay.js')).then(module => {
            if (/^https:\/\/(.+?\.)?ebay\..+?\/(sch|b)\/.+/.test(window.location.href)) {
                module.processSearchPage();
            } else if (/^^https:\/\/(.+?\.)?ebay\..+?\/(itm|p)\/.+/.test(window.location.href)) {
                module.processItemPage();
            } else if (/^^https:\/\/(.+?\.)?ebay\..+?\/(usr|str)\/.+/.test(window.location.href)) {
                module.processUserPage();
            }
        }).catch(err => {
            console.error('Failed to load eBay specific code', err);
        });
    }
}

/**
 * Inserts a button into the page, at the specified container selector.
 * @param {number} size The size of the button, in pixels.
 * @param {string} title The title of the button.
 * @param {string} classList The class list of the button.
 * @param {string} contSelecter The container selector where the button should be inserted.
 */
function insertButton(size, title, classList, contSelecter) {
    let input = $("<input/>", {
        class: classList,
        type: "image",
        width: size,
        height: size,
        title: title,
        alt: "Hide",
        src: chrome.runtime.getURL("src/resources/icon48.png"),
    });
    $(contSelecter).append(input);
}
