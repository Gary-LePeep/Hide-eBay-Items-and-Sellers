
/**
 * Process Search Page
 *
 * This is the function that is executed when the browser loads an ebay search page.
 * First, the list of search results is loaded.
 * Then, any items that have previously been hidden are removed from the results.
 * Finally, the hide-item-button is added onto every remaining item in the search result list.
 */
export function processSearchPage() {
    // Get the list of search results from the page elements
    let ulLists = ["ul.srp-results", "ul#ListViewInner", "ul.b-list__items_nofooter"];
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
        divSelecter = currentList.attr("id") === "ListViewInner" ? "li.sresult" : "li .s-item__wrapper";
        currentList = currentList[0];
    } else {
        return;
    }

    // Hide any items that have already been previously hidden.
    if (divSelecter === "li.sresult") {
        $("li.sresult", currentList).each(function () {
            let itemNumber: string = $(this).attr("listingid") || "";
            if (itemNumber !== "" && contentStorageObject.ebay.items.includes(itemNumber)) {
                $(this).closest("li").remove();
            }
        });
    } else {
        $("li .s-item__info .s-item__link", currentList).each(function () {
            let itemNumber: string = getItemNumber($(this).attr("href"));
            if (itemNumber !== "" && contentStorageObject.ebay.items.includes(itemNumber)) {
                $(this).closest("li").remove();
            }
        });
    }

    // Hide any sellers that have already been previously hidden or dont meet minimums.
    $("li .s-item__info .s-item__seller-info-text", currentList).each(function () {
        let sellerInfoString: string = $(this).text();
        let sellerInfo = processSellerInfo(sellerInfoString);
        if (sellerInfo.sellerName !== "" && contentStorageObject.ebay.sellers.includes(sellerInfo.sellerName)) {
            console.warn("Removing seller: ", sellerInfo);
            $(this).closest("li").remove();
        }
        if (sellerInfo.sellerRating < contentStorageObject.ebay.hideSellersLowerThanReviews) {
            console.warn("Removing seller with low rating: ", sellerInfo);
            $(this).closest("li").remove();
        }
        if (sellerInfo.sellerReviewCount < contentStorageObject.ebay.hideSellersFewerThanReviews) {
            console.warn("Removing seller with low review count: ", sellerInfo);
            $(this).closest("li").remove();
        }
    });

    // Insert hide-item-button onto each item in search results
    let classList = "hide-item-button eh-not-hidden";
    insertButton(30, "Hide item from search results.", classList, $(divSelecter, currentList));
    $($(divSelecter, currentList)).on("click", ".hide-item-button", hideItem);
}

function processSellerInfo(sellerInfo: string) {
    return {
        sellerName: sellerInfo.split(" ")[0].toLowerCase(),
        sellerReviewCount: parseInt(sellerInfo.split(" ")[1].replace(/[()]/g, "").replace(/,/g, "")),
        sellerRating: parseFloat(sellerInfo.split(" ")[2]),
    };
}

/**
 * Extracts the 12-digit item number from a URL.
 *
 * @param {string} url The URL of the item.
 * @returns {string} The 12-digit item number or an empty string if not found.
 */
function getItemNumber(url) {
    const itemNumberMatch = url.match(/itm\/(\d{12})/) || url.match(/iid=(\d{12})/);
    return itemNumberMatch && itemNumberMatch[1].length === 12 ? itemNumberMatch[1] : "";
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
    var itemNumber = "";
    var itemName = "";
    if ($(this).parent("li").hasClass("sresult")) {
        itemNumber = $(this).parent("li.sresult").attr("listingid");
        itemName = $(this).siblings("h3").first().children("a").first().text();
    } else {
        let a = $(this).siblings(".s-item__info").first().children(".s-item__link").first();
        itemNumber = getItemNumber($(a).attr("href"));
        itemName = $(this).siblings(".s-item__info").first().children("a").first().children("h3").first().text();
    }
    // Add item to list of hidden items
    if (itemNumber !== "") {
        if (!contentStorageObject.ebay.items.includes(itemNumber)) {
            contentStorageObject.ebay.items.push(itemNumber);
        }
        updateStorageList();
    }
    $(this).closest("li").remove();
    console.log("item number " + itemNumber + " was hidden");
}

/**
 * Process Item Page
 *
 * This is the function that is executed when the browser loads an ebay item page.
 * All it does is find the user id of the seller,
 * and adds a button next to the name,
 * to allow for the seller to be blocked from search results.
 */
export function processItemPage() {
    // Extract seller user Id from elements
    let sellerHref = $(".x-sellercard-atf__info__about-seller a").first()[0].getAttribute("href");
    let sellerUserId;
    if (sellerHref.includes("/str/")) {
        sellerUserId = sellerHref.split("/str/")[1];
    } else if (sellerHref.includes("/sch/")) {
        sellerUserId = sellerHref.split("/sch/")[1];
    } else if (sellerHref.includes("/usr/")) {
        sellerUserId = sellerHref.split("/usr/")[1];
    }
    sellerUserId = sellerUserId.split("?")[0].split("/")[0];

    // Add hide seller button. Modify the div to make the button look good next to the name
    let userIdHideButtonDiv = document.createElement("div");
    $(".x-sellercard-atf__info__about-seller a").parent("div").first()[0].appendChild(userIdHideButtonDiv);
    userIdHideButtonDiv.style.cssText = `position: relative; left: 25px; top: -2px`;

    let classList = `hide-seller-button ${
        contentStorageObject.ebay.sellers.includes(sellerUserId) ? "eh-is-hidden" : "eh-not-hidden"
    }`;
    insertButton(22, "Hide seller's items from search results.", classList, userIdHideButtonDiv);
    $(userIdHideButtonDiv).on("click", ".hide-seller-button", function () {
        $(this).toggleClass("eh-is-hidden eh-not-hidden");
        updateSellerHiddenStatus(sellerUserId);
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
export function processUserPage() {
    // Extract seller user Id from elements
    let sellerInfoDivs = document.getElementsByClassName("str-seller-card__store-name");
    if (sellerInfoDivs.length != 1) {
        console.warn(`Expected 1 user on this user page, but actually found ${sellerInfoDivs.length}:`, sellerInfoDivs);
        return;
    }
    let sellerUserID = sellerInfoDivs[0]
        .getElementsByTagName("h1")[0]
        .getElementsByTagName("a")[0]
        .innerText.toLowerCase();

    // Add hide seller button. Modify the div to make the button look good next to the name
    let userIdHideButtonDiv = document.createElement("div");
    sellerInfoDivs[0].getElementsByTagName("h1")[0].appendChild(userIdHideButtonDiv);
    userIdHideButtonDiv.style.cssText = `position: relative; left: 35px; top: 2px`;

    let classList = `hide-seller-button ${
        contentStorageObject.ebay.sellers.includes(sellerUserID) ? "eh-is-hidden" : "eh-not-hidden"
    }`;
    insertButton(30, "Hide seller's items from search results.", classList, userIdHideButtonDiv);
    $(userIdHideButtonDiv).on("click", ".hide-seller-button", function () {
        $(this).toggleClass("eh-is-hidden eh-not-hidden");
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
    console.log("updating seller status");
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
