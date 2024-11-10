import { getEasyBlockStorageObject, setEasyBlockStorageObject, EasyBlockStorageObject } from './storage';
import { insertButton } from './content';

/**
 * Initializes and processes the storage object for search page.
 */
export async function processGoogleSearchPage() {
    const targetSelector = "div > div > div > div > h2";
    let classList = "hide-item-button ";

    const observer = new MutationObserver(async () => {
        const targetElement = $(targetSelector);

        if (targetElement.length > 0 && targetElement.find(`.${classList}`).length === 0) {
            let mltuid = targetElement.closest('[data-mltuid]').attr("data-mltuid");
            classList += await getEasyBlockStorageObject().then((easyBlockStorageObject) => {
                if (easyBlockStorageObject.google.items.includes(mltuid)) {
                    return "eh-is-hidden";
                } else {
                    return "eh-not-hidden";
                }
            })
            const buttonContainer = document.createElement("div");
            buttonContainer.style.cssText = "position: relative; left: 12px; top: 12px;";

            insertButton(30, "Hide item from search results.", classList, $(buttonContainer));

            targetElement.parent().append(buttonContainer);
            $(buttonContainer).on("click", ".hide-item-button", hideItem);
            observer.disconnect();
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });
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
            console.log(`Item number ${mltuid} was hidden`);
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
