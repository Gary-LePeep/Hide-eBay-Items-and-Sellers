import { getEasyBlockStorageObject, setEasyBlockStorageObject, EasyBlockStorageObject } from './storage';

/**
 * Populate the "for website" header in the popup.
 * @param {string} websiteUrl The URL of the current website.
 */
export function populateWebsiteHeader(websiteUrl: string): void {
    if (websiteUrl) {
        const websiteName = websiteUrl.replace("https://", "").replace("www.", "");
        $("#forWebsite").text(`for ${websiteName}`);
    }
}

/**
 * Populate the popup with the stored data.
 *
 * The function retrieves the stored data from the storage module and populates the popup with the following data:
 * - The list of hidden sellers.
 * - The list of hidden items.
 * - The hide sponsored setting.
 * - The hide sellers with fewer than X reviews setting.
 * - The hide sellers with a lower than X% reviews setting.
 *
 * The function also sets up event listeners for the following elements:
 * - The hide sponsored checkbox. When the checkbox is changed, the function updates the stored data and shows the "Refresh to Apply" button.
 * - The hide sellers with fewer than X reviews input. When the input is changed and the button is clicked, the function updates the stored data and shows the "Refresh to Apply" button.
 * - The hide sellers with a lower than X% reviews input. When the input is changed and the button is clicked, the function updates the stored data and shows the "Refresh to Apply" button.
 * - The "Refresh to Apply" button. When the button is clicked, the function reloads the current tab.
 */
export async function populatePopup() {
    const easyBlockStorageObject = await getEasyBlockStorageObject();
    const { sellers, items, hideSponsored, hideSellersFewerThanReviews, hideSellersLowerThanReviews } = easyBlockStorageObject.ebay;

    if (sellers.length > 0) {
        $(".seller-list-group .default-list-item").remove();
        sellers.forEach(addListItem.bind(null, easyBlockStorageObject, ".seller-list-group"));
    }

    if (items.length > 0) {
        $(".item-list-group .default-list-item").remove();
        items.forEach(addListItem.bind(null, easyBlockStorageObject, ".item-list-group"));
    }

    $("#hideSponsoredCheck").prop("checked", hideSponsored);
    $("#hideSponsoredCheck").on("change", async () => {
        const updatedEasyBlockStorageObject: EasyBlockStorageObject = await getEasyBlockStorageObject();
        updatedEasyBlockStorageObject.ebay.hideSponsored = $("#hideSponsoredCheck").is(":checked");
        await setEasyBlockStorageObject(updatedEasyBlockStorageObject);
        $("#refreshToApply").removeClass("d-none");
    });

    $("#hideFewerThanReviews").val(hideSellersFewerThanReviews);
    $("#submitHideFewerThanReviews").on("click", async () => {
        const updatedEasyBlockStorageObject: EasyBlockStorageObject = await getEasyBlockStorageObject();
        updatedEasyBlockStorageObject.ebay.hideSellersFewerThanReviews = parseInt(
            $("#hideFewerThanReviews")?.val()?.toString() ?? "0"
        );
        await setEasyBlockStorageObject(updatedEasyBlockStorageObject);
        $("#refreshToApply").removeClass("d-none");
    });

    $("#hideLowerThanReviews").val(hideSellersLowerThanReviews);
    $("#submitHideLowerThanReviews").on("click", async () => {
        const updatedEasyBlockStorageObject: EasyBlockStorageObject = await getEasyBlockStorageObject();
        updatedEasyBlockStorageObject.ebay.hideSellersLowerThanReviews = parseInt(
            $("#hideLowerThanReviews")?.val()?.toString() ?? "0"
        );
        await setEasyBlockStorageObject(updatedEasyBlockStorageObject);
        $("#refreshToApply").removeClass("d-none");
    });

    document.getElementById("refreshToApply")?.addEventListener("click", () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0].id) {
                chrome.tabs.reload(tabs[0].id);
            }
        });
    });
}


/**
 * Initializes the hide and unhide buttons in the popup.
 * @param {EasyBlockStorageObject['ebay']} ebayObject The object containing the lists of hidden sellers and items.
 */
export function initializeHideAndUnhideButtons(ebayObject: EasyBlockStorageObject['ebay']): void {
    $(".list-group").on("click", ".remove-button", async function () {
        const listGroup = $(this).closest("ul");
        const listItem = $(this).parent().get(0);
        const removedValue = $(listItem).find("a").first().text();

        if (listGroup.hasClass("seller-list-group")) {
            ebayObject.sellers = ebayObject.sellers.filter((value) => value !== removedValue);
        } else {
            ebayObject.items = ebayObject.items.filter((value) => value !== removedValue);
        }

        // Update and save the updated ebayObject
        try {
            const easyBlockStorageObject: EasyBlockStorageObject = await getEasyBlockStorageObject();
            easyBlockStorageObject.ebay.sellers = ebayObject.sellers;
            easyBlockStorageObject.ebay.items = ebayObject.items;
            await setEasyBlockStorageObject(easyBlockStorageObject);
        } catch (error) {
            console.error('Failed to update and save easyBlockStorageObject:', error);
        }

        $(listItem).remove();

        const listCount = listGroup.children().length;
        if (listCount === 0) {
            const message = listGroup.hasClass("seller-list-group") ? "No sellers hidden..." : "No items hidden...";
            listGroup.html('<li class="list-group-item align-items-center default-list-item">' + message + "</li>");
        }
    });

    $(".hide-button").on("click", function () {
        const inputGroup = $(this).closest(".input-group");
        const input = inputGroup.children("input").first();
        const value = input?.val()?.toLowerCase();

        if (input.hasClass("userid-input")) {
            if (isValidUserID(ebayObject, inputGroup, value)) {
                completeListUpdate(ebayObject, ".seller-list-group", value);
                input.val("");
            }
        } else {
            if (isValidItemNumber(ebayObject, inputGroup, value)) {
                completeListUpdate(ebayObject, ".item-list-group", value);
                input.val("");
            }
        }
    });
}

/**
 * Checks if a given string is a valid eBay seller user ID.
 *
 * Returns false if the input is too short or too long,
 * or if the user ID already exists in the list.
 * Returns true if the input is valid.
 * @param {object} inputGroup The input group containing the text input field.
 * @param {string} userID The text entered by the user.
 * @return {boolean} False if the input is invalid, true otherwise.
 */
function isValidUserID(ebayObject, inputGroup, userID) {
    let feedbackDiv = $(inputGroup).siblings(".invalid-feedback").first();
    if (/[%\s\/]/.test(userID) || userID.length < 1 || userID.length > 64) {
        $("input", inputGroup).addClass("is-invalid");
        $(feedbackDiv).addClass("d-block").text("Please provide a valid eBay seller user ID.");
        return false;
    } else if (ebayObject.sellers.includes(userID)) {
        $("input", inputGroup).addClass("is-invalid");
        $(feedbackDiv).addClass("d-block").text("You have already added this seller to the list.");
        return false;
    } else {
        $("input", inputGroup).removeClass("is-invalid");
        $(feedbackDiv).removeClass("d-block");
        return true;
    }
}


/**
 * Checks if a given string is a valid eBay item number.
 *
 * Returns false if the input is invalid or already exists in the list.
 * Returns true if the input is valid.
 * @param {object} ebayObject The object containing the list of hidden items and sellers.
 * @param {object} inputGroup The input group containing the text input field.
 * @param {string} itemNumber The text entered by the user.
 * @return {boolean} False if the input is invalid, true otherwise.
 */
function isValidItemNumber(ebayObject, inputGroup, itemNumber) {
    const input = $("input", inputGroup);
    const feedbackDiv = $(inputGroup).siblings(".invalid-feedback").first();

    if (itemNumber.length !== 12 || !/^\d+$/.test(itemNumber)) {
        input.addClass("is-invalid");
        feedbackDiv.addClass("d-block").text("Please provide a valid eBay item number.");
        return false;
    } else if (ebayObject.items.includes(itemNumber)) {
        input.addClass("is-invalid");
        feedbackDiv.addClass("d-block").text("You have already added this item to the list.");
        return false;
    }

    input.removeClass("is-invalid");
    feedbackDiv.removeClass("d-block");
    return true;
}


/**
 * Completes the process of adding a new item to the list.
 *
 * If the list was empty, this function removes the default list item.
 * It then adds the new item to the list, and scrolls to the bottom of the list.
 * Finally, it updates the list stored in local storage.
 * @param {object} listGroup The list group containing the new item.
 * @param {string} value The text of the new item.
 */
async function completeListUpdate(ebayObject, listGroup, value) {
    if ($(listGroup).children().length === 1) {
        let listItem = $(listGroup).children().first();
        if ($(listItem).hasClass("default-list-item")) {
            $(listItem).remove();
        }
    }
    addListItem(ebayObject, listGroup, value);
    let bottom = $("li:last-child", listGroup)?.offset()?.top ?? 0;
    $("li:last-child", listGroup).scrollTop(bottom);
    if ($(listGroup).hasClass("seller-list-group")) {
        ebayObject.sellers.push(value);
    } else {
        ebayObject.items.push(value);
    }
    try {
        const easyBlockStorageObject: EasyBlockStorageObject = await getEasyBlockStorageObject();
        easyBlockStorageObject.ebay.sellers = ebayObject.sellers;
        easyBlockStorageObject.ebay.items = ebayObject.items;
        await setEasyBlockStorageObject(easyBlockStorageObject);
    } catch (error) {
        console.error('Failed to update and save easyBlockStorageObject:', error);
    }
}

/**
 * Adds a new list item to the list group specified by the selector.
 * The value parameter is the text of the new item.
 * @param {object} ebayObject The ebay object containing the base_url.
 * @param {string} listGroupSelector The selector of the list group to add the item to.
 * @param {string} value The text of the new item.
 */
function addListItem(ebayObject, listGroupSelector, value) {
    const listGroup = $(listGroupSelector);
    const href = ebayObject.base_url === "" ? "https://ebay.com" : ebayObject.base_url;
    const linkHref = listGroup.hasClass("seller-list-group") ? href + "/usr/" + value : href + "/itm/" + value;
    const listItem =
        `<li class="list-group-item d-flex justify-content-between align-items-center">
            <div class="link-container">
                <a class="list-item-link text-danger" target="_blank" href="${linkHref}">${value}</a>
            </div>
            <button type="button" name="remove" class="btn btn-outline-danger py-0 remove-button">x</button>
        </li>`;

    listGroup.append(listItem);
}
