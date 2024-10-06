import { getEasyBlockStorageObject, setEasyBlockStorageObject, EasyBlockStorageObject } from './storage';
import { insertButton } from './content';

/**
 * Initializes and processes the storage object for search page.
 */
export async function processAmazonSearchPage() {
    try {
        const searchResultLists = ["div.s-result-list"];
        const currentList = searchResultLists.map(item => $(item)).find(list => list.length > 0);
        if (!currentList) return;

        const divSelector = "div.s-result-item";
        const items = $(divSelector, currentList[0]);

        hidePreviouslyHiddenItems(items);

        const classList = "hide-item-button eh-not-hidden";
        
        items.each((index, item) => {
            const targetContainer = $(item).find("div.sg-col-inner > div.s-widget-container > span.a-declarative > div.puis-card-container > div.a-section");
            if (targetContainer.length > 0) {
                insertButton(30, "Hide item from search results.", classList, targetContainer);
            }
            targetContainer.on("click", ".hide-item-button", hideItem);
        });
    } catch (error) {
        console.error('Failed to process search page:', error);
    }
}

function hidePreviouslyHiddenItems(items: JQuery<HTMLElement>) {
    getEasyBlockStorageObject().then((easyBlockStorageObject) => {
        items.each(function () {
            const itemNumber = $(this).attr("data-asin");
            if (itemNumber && easyBlockStorageObject.amazon.items.includes(itemNumber)) {
                $(this).remove();
            }
        });
    });
}

/**
 * Extracts the 10-char ASIN from a URL.
 */
function getItemNumber(url: string) {
    const itemNumberMatch = url.match(/\/dp\/([a-zA-Z0-9]{10})\//);
    return itemNumberMatch && itemNumberMatch[1].length === 10 ? itemNumberMatch[1] : "";
}

/**
 * Hides item from search results on button click.
 */
function hideItem() {
    getEasyBlockStorageObject().then((easyBlockStorageObject) => {
        const itemNumber = $(this).closest('.s-result-item').data("asin");

        if (itemNumber) {
            if (!easyBlockStorageObject.amazon.items.includes(itemNumber)) {
                easyBlockStorageObject.amazon.items.push(itemNumber);
                setEasyBlockStorageObject(easyBlockStorageObject);
            }
            $(this).closest('.s-result-item').remove();
            console.log(`Item number ${itemNumber} was hidden`);
        }
    });
}

/**
 * Process Item Page
 * Handles processing of the Amazon item page to add the item hide button.
 */
export async function processAmazonItemPage() {
    const itemAsin = $("#centerCol > #title_feature_div").first().attr("data-csa-c-asin");
    let classList;
    await getEasyBlockStorageObject().then((easyBlockStorageObject) => {
        classList = `hide-seller-button ${easyBlockStorageObject.amazon.items.includes(itemAsin) ? "eh-is-hidden" : "eh-not-hidden"}`;
    });

    const userIdHideButtonDiv = document.createElement("div");
    $("#title_feature_div").first().append(userIdHideButtonDiv);
    userIdHideButtonDiv.style.cssText = `position: relative; float: right`;

    insertButton(36, "Hide item from search results.", classList, userIdHideButtonDiv);
    $(userIdHideButtonDiv).on("click", ".hide-seller-button", function () {
        $(this).toggleClass("eh-is-hidden eh-not-hidden");
        getEasyBlockStorageObject().then(async (easyBlockStorageObject) => {
            if (easyBlockStorageObject.amazon.items.includes(itemAsin)) {
                easyBlockStorageObject.amazon.items = easyBlockStorageObject.amazon.items.filter(item => item !== itemAsin);
            } else {
                easyBlockStorageObject.amazon.items.push(itemAsin);
            }
            await setEasyBlockStorageObject(easyBlockStorageObject);
        });
    });
}
