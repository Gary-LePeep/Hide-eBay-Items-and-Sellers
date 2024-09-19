/********************************************************
 *                   Browser Storage                    *
 *******************************************************/

let contentStorageObject = {
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
 * Retrieves the storage object from local storage.
 */
chrome.storage.local.get({
    easyBlockStorageObject: contentStorageObject
}, function (data) {
    contentStorageObject = data.easyBlockStorageObject;
    processWebpage();
});

/**
 * Saves the storage object to local storage.
 */
function updateStorageList() {
    chrome.storage.local.set({
        easyBlockStorageObject: contentStorageObject
    }, function () {
        console.log('content.js updated easyBlockStorageObject:', JSON.stringify(easyBlockStorageObject));
    });
}

/**
 * Listens for changes to the storage object, and updates it if a change is detected.
 */
chrome.storage.onChanged.addListener(function (changes, namespace) {
    for (var key in changes) {
        if (key === 'easyBlockStorageObject') {
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
 *   `usr`: This is the page of a user.
 * Depending on which type of page it is, process that type of webpage.
 */
function processWebpage() {
    if (/^https:\/\/(.+?\.)?ebay\..+?\/(sch|b)\/.+/.test(window.location.href)) {
        processSearchPage();
    } else if (/^^https:\/\/(.+?\.)?ebay\..+?\/(itm|p)\/.+/.test(window.location.href)) {
        processItemPage();
    } else if (/^^https:\/\/(.+?\.)?ebay\..+?\/usr\/.+/.test(window.location.href)) {
        processUserPage();
    }
}

/**
 * Process Search Page
 * 
 * This is the function that is executed when the browser loads an ebay search page.
 * First, the list of search results is loaded.
 * Then, any items that have previously been hidden are removed from the results.
 * Finally, the hide-item-button is added onto every remaining item in the search result list.
 */
function processSearchPage() {
    // Get the list of search results from the page elements
    let ulLists = ['ul.srp-results', 'ul#ListViewInner', 'ul.b-list__items_nofooter'];
    let currentList = null;
    let divSelecter = null;
    for (let item in ulLists) {
        if (ulLists.hasOwnProperty(item)) {
            if ($(ulLists[item]).length) {
                currentList = $(ulLists[item]);
                break;
            }
        }
    }

    // If list exists, extract attribute `0` which contains the item list elements.
    // If list does not exist, just return.
    if (currentList) {
        divSelecter = (currentList.attr('id') === 'ListViewInner') ? 'li.sresult' : 'li .s-item__wrapper';
        currentList = currentList[0];
    } else {
        return;
    }

    // Hide any items that have already been previously hidden.
    if (divSelecter === 'li.sresult') {
        $('li.sresult', currentList).each(function () {
            let itemNumber: string = $(this).attr('listingid') || '';
            if (itemNumber !== '' && contentStorageObject.ebay.items.includes(itemNumber)) {
                $(this).closest('li').remove();
            }
        });
    } else {
        $('li .s-item__info .s-item__link', currentList).each(function () {
            let itemNumber: string = getItemNumber($(this).attr('href'));
            if (itemNumber !== '' && contentStorageObject.ebay.items.includes(itemNumber)) {
                $(this).closest('li').remove();
            }
        });
    }

    // Hide any sellers that have already been previously hidden.
    $('li .s-item__info .s-item__seller-info-text', currentList).each(function () {
        let sellerInfoString: string = $(this).text();
        let sellerInfo = processSellerInfo(sellerInfoString);
        if (sellerInfo.sellerName !== '' && contentStorageObject.ebay.sellers.includes(sellerInfo.sellerName)) {
            $(this).closest('li').remove();
        }
    });

    // Hide sponsored items if option is enabled
    if (contentStorageObject.ebay.hideSponsored) {
        $('div .s-item__detail s-item__detail--primary', currentList).each(function () {
            console.warn("sponsored: ", $(this));
        })
    }

    // Insert hide-item-button onto each item in search results
    let classList = 'hide-item-button eh-not-hidden';
    insertButton(30, 'Hide item from search results.', classList, $(divSelecter, currentList));
    $($(divSelecter, currentList)).on('click', '.hide-item-button', hideItem);
}

function processSellerInfo(sellerInfo: string) {
    return {
        sellerName: sellerInfo.split(' ')[0].toLowerCase(),
        sellerReviewCount: sellerInfo.split(' ')[1].replace(/[()]/g, ''),
        sellerRating: parseFloat(sellerInfo.split(' ')[2])
    }
}

/**
 * Extracts the 12-digit item number from a URL.
 * 
 * @param {string} url The URL of the item.
 * @returns {string} The 12-digit item number or an empty string if not found.
 */
function getItemNumber(url) {
    const itemNumberMatch = url.match(/itm\/(\d{12})/) || url.match(/iid=(\d{12})/);
    return itemNumberMatch && itemNumberMatch[1].length === 12 ? itemNumberMatch[1] : '';
}

/**
 * Hide Item
 * 
 * This function is called when the user clicks a button to hide an item from search results.
 * It gets the item number and name from the elements,
 * adds it to the list of hidden items,
 * and removes the item from the search results page.
 * @this {HTMLElement} The element that was clicked.
 */
function hideItem() {
    var itemNumber = '';
    var itemName = '';
    if ($(this).parent('li').hasClass('sresult')) {
        itemNumber = $(this).parent('li.sresult').attr('listingid');
        itemName = $(this).siblings('h3').first().children('a').first().text();
    } else {
        let a = $(this).siblings('.s-item__info').first().children('.s-item__link').first();
        itemNumber = getItemNumber($(a).attr('href'));
        itemName = $(this).siblings('.s-item__info').first().children('a').first().children('h3').first().text();
    }
    // Add item to list of hidden items
    if (itemNumber !== '') {
        if (!contentStorageObject.ebay.items.includes(itemNumber)) {
            contentStorageObject.ebay.items.push(itemNumber);
        }
        updateStorageList();
    }
    $(this).closest('li').remove();
    console.log('item number ' + itemNumber + ' was hidden');
}

/**
 * Process Item Page
 * 
 * This is the function that is executed when the browser loads an ebay item page.
 * All it does is find the user id of the seller,
 * and adds a button next to the name,
 * to allow for the seller to be blocked from search results.
 */
function processItemPage() {
    // Extract seller user Id from elements
    let sellerInfoDivs: HTMLCollectionOf<HTMLDivElement> = document.getElementsByClassName('x-sellercard-atf__info__about-seller') as HTMLCollectionOf<HTMLDivElement>
    if (sellerInfoDivs.length != 1) {
        console.warn(`Expected 1 seller on this item page, but actually found ${sellerInfoDivs.length}:`, sellerInfoDivs)
        return;
    }
    let sellerUserID = sellerInfoDivs[0].innerText.split('\n')[0].toLowerCase()

    // Add hide seller button. Modify the div to make the button look good next to the name
    let userIdHideButtonDiv = document.createElement('div')
    sellerInfoDivs[0].appendChild(userIdHideButtonDiv)
    userIdHideButtonDiv.style.cssText = `position: relative; left: 25px; top: -2px`

    let classList = `hide-seller-button ${contentStorageObject.ebay.sellers.includes(sellerUserID) ? 'eh-is-hidden' : 'eh-not-hidden'}`;
    insertButton(22, 'Hide seller\'s items from search results.', classList, userIdHideButtonDiv);
    $(userIdHideButtonDiv).on('click', '.hide-seller-button', function () {
        $(this).toggleClass('eh-is-hidden eh-not-hidden');
        updateSellerHiddenStatus(sellerUserID);
    });
}

/**
 * Process User Page
 * 
 * This is the function that is executed when the browser loads an ebay user page.
 * All it does is find the user id of the seller,
 * and adds a button next to the name,
 * to allow for the seller to be blocked from search results.
 */
function processUserPage() {
    // Extract seller user Id from elements
    let sellerInfoDivs = document.getElementsByClassName('str-seller-card__store-name')
    if (sellerInfoDivs.length != 1) {
        console.warn(`Expected 1 user on this user page, but actually found ${sellerInfoDivs.length}:`, sellerInfoDivs)
        return;
    }
    let sellerUserID = sellerInfoDivs[0].getElementsByTagName("h1")[0].getElementsByTagName("a")[0].innerText.toLowerCase();

    // Add hide seller button. Modify the div to make the button look good next to the name
    let userIdHideButtonDiv = document.createElement('div')
    sellerInfoDivs[0].getElementsByTagName("h1")[0].appendChild(userIdHideButtonDiv)
    userIdHideButtonDiv.style.cssText = `position: relative; left: 35px; top: 2px`

    let classList = `hide-seller-button ${contentStorageObject.ebay.sellers.includes(sellerUserID) ? 'eh-is-hidden' : 'eh-not-hidden'}`;
    insertButton(30, 'Hide seller\'s items from search results.', classList, userIdHideButtonDiv);
    $(userIdHideButtonDiv).on('click', '.hide-seller-button', function () {
        $(this).toggleClass('eh-is-hidden eh-not-hidden');
        updateSellerHiddenStatus(sellerUserID);
    });
}

/**
 * Update Seller Hidden Status
 * 
 * This function is called when the user clicks a button to hide a seller from search results.
 * It adds the seller user id to the list of hidden sellers.
 * @param {string} sellerUserID The user id of the seller.
 * @this {HTMLElement} The element that was clicked.
 */
function updateSellerHiddenStatus(sellerUserID) {
    console.log('updating seller status');
    console.log(sellerUserID);
    if (contentStorageObject.ebay.sellers.includes(sellerUserID)) {
        contentStorageObject.ebay.sellers = $.grep(contentStorageObject.ebay.sellers, function (value) {
            return value != sellerUserID;
        });
    } else {
        contentStorageObject.ebay.sellers.push(sellerUserID);
    }
    updateStorageList();
}

/**
 * Inserts a button into the page, at the specified container selector.
 * @param {number} size The size of the button, in pixels.
 * @param {string} title The title of the button.
 * @param {string} classList The class list of the button.
 * @param {string} contSelecter The container selector where the button should be inserted.
 */
function insertButton(size, title, classList, contSelecter) {
    let input = $('<input/>', {
        "class": classList,
        type: 'image',
        width: size,
        height: size,
        title: title,
        alt: 'Hide',
        src: chrome.runtime.getURL('src/resources/icon48.png'),
    });
    $(contSelecter).append(input);
}

