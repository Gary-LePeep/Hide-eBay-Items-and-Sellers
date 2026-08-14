import { getEasyBlockStorageObject, setEasyBlockStorageObject, EasyBlockStorageObject } from './storage';
import { insertButton, suppressPageClick } from './content';

/**
 * Initializes and processes the storage object for search page.
 */
export async function processEbaySearchPage() {
    try {
        const searchResultLists = ["ul.srp-results", "ul#ListViewInner", "ul.b-list__items_nofooter", "ul.brwrvr__item-results"];
        const currentList = searchResultLists.map(item => $(item)).find(list => list.length > 0);
        if (!currentList) return;

        let divSelector = "li .s-item__wrapper";
        if (currentList.attr("id") === "ListViewInner") {
            divSelector = "li.sresult";
        } else if (currentList.hasClass("brwrvr__item-results brwrvr__item-results--list")) {
            divSelector = "li .brwrvr__item-card__body .brwrvr__item-card__wrapper";
        } else if ($("li.s-card", currentList[0]).length > 0) {
            divSelector = "li.s-card";
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
        const items = divSelector === "li.sresult" ? $("li.sresult", currentList) : $("li a[href*='/itm/']", currentList);

        items.each(function () {
            const itemNumber = divSelector === "li.sresult" ? $(this).attr("listingid") : getItemNumber($(this).attr("href"));
            if (itemNumber && easyBlockStorageObject.ebay.items.includes(itemNumber)) {
                $(this).closest("li").remove();
            }
        });
    });
}

const SELLER_INFO_SELECTOR = "li .s-card__attribute-row, li .s-item__info .s-item__seller-info-text";

function hidePreviouslyHiddenSellers(currentList: HTMLElement) {
    getEasyBlockStorageObject().then((easyBlockStorageObject) => {
        $(SELLER_INFO_SELECTOR, currentList).each(function () {
            const sellerInfoString = $(this).text();
            
            if (!/%\s*positive/i.test(sellerInfoString)) {
                return;
            }
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
 *
 * Matches on shape rather than position, because eBay orders the parts differently
 * between layouts -- "seller (405) 100%" on the older markup versus
 * "seller 100% positive (405)" on the newer cards.
 */
function processSellerInfo(sellerInfo: string) {
    const text = sellerInfo.trim();
    const ratingMatch = text.match(/(\d+(?:\.\d+)?)\s*%/);
    const countMatch = text.match(/\(\s*([\d.,]+)\s*([KMkm]?)\s*\)/);

    return {
        sellerName: text.split(/\s+/)[0].toLowerCase(),
        sellerReviewCount: countMatch ? expandAbbreviatedCount(countMatch[1], countMatch[2]) : NaN,
        sellerRating: ratingMatch ? parseFloat(ratingMatch[1]) : NaN,
    };
}

function expandAbbreviatedCount(digits: string, suffix: string): number {
    const value = parseFloat(digits.replace(/,/g, ""));
    if (isNaN(value)) return NaN;

    const multiplier = { k: 1000, m: 1000000 }[suffix.toLowerCase()] ?? 1;
    return Math.round(value * multiplier);
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
function hideItem(event: JQuery.ClickEvent) {
    suppressPageClick(event);
    getEasyBlockStorageObject().then((easyBlockStorageObject) => {
        let itemNumber = "";

        if ($(this).parent("li").hasClass("sresult")) {
            itemNumber = $(this).parent("li.sresult").attr("listingid");
        } else {
            const a = $(this).closest("li").find("a[href*='/itm/']").first();
            itemNumber = getItemNumber(a.attr("href") || "");
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
 * Reads the seller's user id from a "Seller's other items" link, which carries it as the
 * _ssn query parameter.
 */
function findSellerUserIdFromSsn(): string {
    const inCard = readSellerUserIdParam($(".x-sellercard-atf a[href*='_ssn=']"));
    if (inCard) return inCard;

    // The narrow layout puts the link outside the card, so fall back to the rest of the
    // page, but only when every _ssn link agrees on who the seller is.
    const candidates = new Set<string>();
    $("a[href*='_ssn=']").each(function () {
        const userId = readSellerUserIdParam($(this));
        if (userId) candidates.add(userId);
    });
    return candidates.size === 1 ? candidates.values().next().value : "";
}

function findSellerUserId(): string {
    const fromSsn = findSellerUserIdFromSsn();
    if (fromSsn) return fromSsn;

    // Older markup linked straight to the seller's store or user page.
    const sellerHref = $(".x-sellercard-atf__info__about-seller a").first().attr("href");
    return sellerHref ? extractSellerUserId(sellerHref) : "";
}

function readSellerUserIdParam(links: JQuery<HTMLElement>): string {
    const match = links.first().attr("href")?.match(/[?&]_ssn=([^&#]+)/);
    return match ? decodeURIComponent(match[1]).toLowerCase() : "";
}

/**
 * The row the hide button is appended to. The wide layout groups the seller name and
 * review count in an about-seller row; the narrow layout drops that row and renders the
 * name in a data item instead.
 */
function findSellerCardRow(): JQuery<HTMLElement> | null {
    const wideRow = $(".x-sellercard-atf__about-seller").first();
    if (wideRow.length) return wideRow;

    const narrowRow = $(".x-sellercard-atf__data-item").first();
    return narrowRow.length ? narrowRow : null;
}

/**
 * Process Item Page
 * Handles processing of the eBay item page to add the seller hide button.
 */
export async function processEbayItemPage() {
    getEasyBlockStorageObject().then((easyBlockStorageObject) => {
        const sellerUserId = findSellerUserId();
        const sellerCardRow = findSellerCardRow();
        if (!sellerUserId || !sellerCardRow) return;

        const userIdHideButtonDiv = document.createElement("div");
        userIdHideButtonDiv.className = "eh-seller-button-container";
        sellerCardRow.append(userIdHideButtonDiv);

        const classList = `hide-seller-button ${easyBlockStorageObject.ebay.sellers.includes(sellerUserId) ? "eh-is-hidden" : "eh-not-hidden"}`;
        insertButton(22, "Hide seller's items from search results.", classList, userIdHideButtonDiv);
        $(userIdHideButtonDiv).on("click", ".hide-seller-button", function (event) {
            suppressPageClick(event);
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
export async function processEbayUserPage() {
    getEasyBlockStorageObject().then((easyBlockStorageObject) => {
        const sellerInfoDivs = document.getElementsByClassName("str-seller-card__store-name");
        if (sellerInfoDivs.length !== 1) {
            console.warn(`Expected 1 user on this user page, but actually found ${sellerInfoDivs.length}:`, sellerInfoDivs);
            return;
        }

        // The heading shows the store's display name, which is not the user id that search
        // results are matched against -- "Triple J Equipment" versus "triplejequipment".
        const headingLink = sellerInfoDivs[0].getElementsByTagName("h1")[0].getElementsByTagName("a")[0];
        const sellerUserId = findSellerUserIdFromSsn() || headingLink.innerText.trim().toLowerCase();

        const userIdHideButtonDiv = document.createElement("div");
        sellerInfoDivs[0].getElementsByTagName("h1")[0].appendChild(userIdHideButtonDiv);
        userIdHideButtonDiv.className = "eh-seller-button-container";

        const classList = `hide-seller-button ${easyBlockStorageObject.ebay.sellers.includes(sellerUserId) ? "eh-is-hidden" : "eh-not-hidden"}`;
        insertButton(30, "Hide seller's items from search results.", classList, userIdHideButtonDiv);
        $(userIdHideButtonDiv).on("click", ".hide-seller-button", function (event) {
            suppressPageClick(event);
            $(this).toggleClass("eh-is-hidden eh-not-hidden");
            updateSellerHiddenStatus(easyBlockStorageObject, sellerUserId);
        });
    });
}
