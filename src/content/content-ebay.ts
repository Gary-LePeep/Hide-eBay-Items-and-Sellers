import { getEasyBlockStorageObject, setEasyBlockStorageObject, EasyBlockStorageObject } from './storage';
import { insertButton } from './content';

/**
 * Initializes and processes the storage object for search page.
 */
export async function processSearchPage() {
    try {
        const easyBlockStorageObject = await getEasyBlockStorageObject();

        const searchResultLists = ["ul.srp-results", "ul#ListViewInner", "ul.b-list__items_nofooter", "ul.brwrvr__item-results"];
        const currentList = searchResultLists.map(item => $(item)).find(list => list.length > 0);
        if (!currentList) return;

        let divSelector = "li .s-item__wrapper";
        if (currentList.attr("id") === "ListViewInner") {
            divSelector = "li.sresult";
        } else if (currentList.hasClass("brwrvr__item-results brwrvr__item-results--list")) {
            divSelector = "li .brwrvr__item-card__body .brwrvr__item-card__wrapper";
        }

        hidePreviouslyHiddenItems(currentList[0], divSelector);
        hidePreviouslyHiddenSellers(currentList[0]);

        const classList = "hide-item-button eh-not-hidden";
        const items = $(divSelector, currentList[0]);
        insertButton(30, "Hide item from search results.", classList, items);
        $($(divSelector, currentList[0])).on("click", ".hide-item-button", hideItem);
    } catch (error) {
        console.error('Failed to process search page:', error);
    }
}

function hidePreviouslyHiddenItems(currentList: HTMLElement, divSelector: string) {
    getEasyBlockStorageObject().then((easyBlockStorageObject) => {
        const items = divSelector === "li.sresult" ? $("li.sresult", currentList) : $("li .s-item__info .s-item__link", currentList);

        items.each(function () {
            const itemNumber = divSelector === "li.sresult" ? $(this).attr("listingid") : getItemNumber($(this).attr("href"));
            if (itemNumber && easyBlockStorageObject.ebay.items.includes(itemNumber)) {
                $(this).closest("li").remove();
            }
        });
    });
}

function hidePreviouslyHiddenSellers(currentList: HTMLElement) {
    getEasyBlockStorageObject().then((easyBlockStorageObject) => {
        $("li .s-item__info .s-item__seller-info-text", currentList).each(function () {
            const sellerInfoString = $(this).text();
            const sellerInfo = processSellerInfo(sellerInfoString);

            if (sellerInfo.sellerName && easyBlockStorageObject.ebay.sellers.includes(sellerInfo.sellerName)) {
                $(this).closest("li").remove();
            }

            if (sellerInfo.sellerRating < easyBlockStorageObject.ebay.hideSellersLowerThanReviews) {
                $(this).closest("li").remove();
            }

            if (sellerInfo.sellerReviewCount < easyBlockStorageObject.ebay.hideSellersFewerThanReviews) {
                $(this).closest("li").remove();
            }
        });
    });
}

/**
 * Processes seller information and returns an object containing seller details.
 */
function processSellerInfo(sellerInfo: string) {
    const parts = sellerInfo.split(" ");
    return {
        sellerName: parts[0].toLowerCase(),
        sellerReviewCount: parseInt(parts[1].replace(/[()]/g, "").replace(/,/g, "")),
        sellerRating: parseFloat(parts[2]),
    };
}

/**
 * Extracts the 12-digit item number from a URL.
 */
function getItemNumber(url: string) {
    const itemNumberMatch = url.match(/itm\/(\d{12})/) || url.match(/iid=(\d{12})/);
    return itemNumberMatch && itemNumberMatch[1].length === 12 ? itemNumberMatch[1] : "";
}

/**
 * Hides item from search results on button click.
 */
function hideItem() {
    getEasyBlockStorageObject().then((easyBlockStorageObject) => {
        let itemNumber = "";
        const itemName = $(this).siblings(".s-item__info").first().children(".s-item__link").first().children("h3").first().text();

        if ($(this).parent("li").hasClass("sresult")) {
            itemNumber = $(this).parent("li.sresult").attr("listingid");
        } else {
            const a = $(this).siblings(".s-item__info").first().children(".s-item__link").first();
            itemNumber = getItemNumber($(a).attr("href"));
        }

        if (itemNumber) {
            if (!easyBlockStorageObject.ebay.items.includes(itemNumber)) {
                easyBlockStorageObject.ebay.items.push(itemNumber);
                setEasyBlockStorageObject(easyBlockStorageObject);
            }
            $(this).closest("li").remove();
            console.log(`Item number ${itemNumber} was hidden`);
        }
    });
}

/**
 * Process Item Page
 * Handles processing of the eBay item page to add the seller hide button.
 */
export async function processItemPage() {
    getEasyBlockStorageObject().then((easyBlockStorageObject) => {
        
        const sellerHref = $(".x-sellercard-atf__info__about-seller a").first().attr("href");
        const sellerUserId = extractSellerUserId(sellerHref);

        const userIdHideButtonDiv = document.createElement("div");
        $(".x-sellercard-atf__info__about-seller a").parent("div").first().append(userIdHideButtonDiv);
        userIdHideButtonDiv.style.cssText = `position: relative; left: 25px; top: -2px`;

        const classList = `hide-seller-button ${easyBlockStorageObject.ebay.sellers.includes(sellerUserId) ? "eh-is-hidden" : "eh-not-hidden"}`;
        insertButton(22, "Hide seller's items from search results.", classList, userIdHideButtonDiv);
        $(userIdHideButtonDiv).on("click", ".hide-seller-button", function () {
            $(this).toggleClass("eh-is-hidden eh-not-hidden");
            updateSellerHiddenStatus(easyBlockStorageObject, sellerUserId);
        });
    });
}

/**
 * Update Seller Hidden Status
 * Updates the hidden status of a seller based on the user's action.
 */
async function updateSellerHiddenStatus(easyBlockStorageObject: EasyBlockStorageObject, sellerUserID: string) {
    if (easyBlockStorageObject.ebay.sellers.includes(sellerUserID)) {
        easyBlockStorageObject.ebay.sellers = easyBlockStorageObject.ebay.sellers.filter(seller => seller !== sellerUserID);
    } else {
        easyBlockStorageObject.ebay.sellers.push(sellerUserID);
    }
    await setEasyBlockStorageObject(easyBlockStorageObject);
}

/**
 * Extracts the seller user ID from the seller's href.
 */
function extractSellerUserId(sellerHref: string): string {
    let sellerUserId = "";
    const parts = sellerHref.split(/\/(str|usr|sch)\//);
    if (parts.length > 1) {
        sellerUserId = parts[2].split("?")[0].split("/")[0];
    }
    return sellerUserId;
}

/**
 * Process User Page
 * Handles processing of the eBay user page to add the seller hide button.
 */
export async function processUserPage() {
    getEasyBlockStorageObject().then((easyBlockStorageObject) => {
        const sellerInfoDivs = document.getElementsByClassName("str-seller-card__store-name");
        if (sellerInfoDivs.length !== 1) {
            console.warn(`Expected 1 user on this user page, but actually found ${sellerInfoDivs.length}:`, sellerInfoDivs);
            return;
        }

        const sellerUserId = sellerInfoDivs[0].getElementsByTagName("h1")[0].getElementsByTagName("a")[0].innerText.toLowerCase();

        const userIdHideButtonDiv = document.createElement("div");
        sellerInfoDivs[0].getElementsByTagName("h1")[0].appendChild(userIdHideButtonDiv);
        userIdHideButtonDiv.style.cssText = `position: relative; left: 35px; top: 2px`;

        const classList = `hide-seller-button ${easyBlockStorageObject.ebay.sellers.includes(sellerUserId) ? "eh-is-hidden" : "eh-not-hidden"}`;
        insertButton(30, "Hide seller's items from search results.", classList, userIdHideButtonDiv);
        $(userIdHideButtonDiv).on("click", ".hide-seller-button", function () {
            $(this).toggleClass("eh-is-hidden eh-not-hidden");
            updateSellerHiddenStatus(easyBlockStorageObject, sellerUserId);
        });
    });
}
