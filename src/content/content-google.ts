import { getEasyBlockStorageObject, setEasyBlockStorageObject, EasyBlockStorageObject } from './storage';
import { insertButton } from './content';

/**
 * Initializes and processes the storage object for search page.
 */
export async function processGoogleSearchPage() {
    hidePreviouslyHiddenItems()

    const targetSelector = "div > div > div > div > h2";
    let currentTarget = null;

    const observer = new MutationObserver(async () => {
        const targetElement = $(targetSelector);

        // Check if the target element is different
        if (targetElement[0] !== currentTarget) {
            currentTarget = targetElement[0];
            let classList = "hide-item-button";

            // Check if the button already exists as a sibling; if so, return early
            if (targetElement.siblings("div").find(`.${classList}`).length > 0) {
                return;
            }

            // Temporarily disconnect the observer to avoid duplicates
            observer.disconnect();

            // Get the closest ancestor's data-mltuid attribute
            let mltuid = targetElement.closest('[data-mltuid]').attr("data-mltuid");

            // Add button within a container
            const buttonContainer = document.createElement("div");
            buttonContainer.style.cssText = "position: relative; left: 12px; top: 12px;";
            classList += await getEasyBlockStorageObject().then((easyBlockStorageObject) => {
                return easyBlockStorageObject.google.items.includes(mltuid)
                    ? " eh-is-hidden"
                    : " eh-not-hidden";
            });
            insertButton(30, "Hide item from search results.", classList, $(buttonContainer));

            targetElement.parent().append(buttonContainer);
            $(buttonContainer).on("click", ".hide-item-button", hideItem);

            // Re-enable the observer after button addition
            observer.observe(document.body, { childList: true, subtree: true });
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });
}

function hidePreviouslyHiddenItems() {
    getEasyBlockStorageObject().then((easyBlockStorageObject) => {
        for (const mltuid of easyBlockStorageObject.google.items) {
            const itemToHide = $(`div[data-oid="${mltuid}"]`);
            if (itemToHide.length > 0) {
                itemToHide.css("display", "none");
            }
        }
    });
}


function hidePreviouslyHiddenSellers(currentList: HTMLElement) {
    getEasyBlockStorageObject().then((easyBlockStorageObject) => {
        $("li .s-item__info .s-item__seller-info-text", currentList).each(function () {
            const sellerInfoString = $(this).text();
            const sellerInfo = processSellerInfo(sellerInfoString);

            if (sellerInfo.sellerName && easyBlockStorageObject.google.sellers.includes(sellerInfo.sellerName)) {
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
        let mltuid = $(this).closest('[data-mltuid]').attr("data-mltuid");

        if (mltuid) {
            if (!easyBlockStorageObject.google.items.includes(mltuid)) {
                easyBlockStorageObject.google.items.push(mltuid);
                setEasyBlockStorageObject(easyBlockStorageObject);
            }
            $(this).removeClass("eh-not-hidden");
            $(this).addClass("eh-is-hidden");
            console.log(`Item number ${mltuid} was added to the hide list`);

            // Find the div with the matching data-oid attribute and hide it
            const itemToHide = $(`div[data-oid="${mltuid}"]`);
            if (itemToHide.length > 0) {
                itemToHide.css("display", "none");
                console.log(`Item with number ${mltuid} is now hidden.`);
            } else {
                console.warn(`No item found with number ${mltuid}.`);
            }
        }
    });
}

/**
 * Update Seller Hidden Status
 * Updates the hidden status of a seller based on the user's action.
 */
async function updateSellerHiddenStatus(easyBlockStorageObject: EasyBlockStorageObject, sellerUserID: string) {
    if (easyBlockStorageObject.google.sellers.includes(sellerUserID)) {
        easyBlockStorageObject.google.sellers = easyBlockStorageObject.google.sellers.filter(seller => seller !== sellerUserID);
    } else {
        easyBlockStorageObject.google.sellers.push(sellerUserID);
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
