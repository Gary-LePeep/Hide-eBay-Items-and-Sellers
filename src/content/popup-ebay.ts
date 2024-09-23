import { getEasyBlockStorageObject, setEasyBlockStorageObject, EasyBlockStorageObject } from './storage.js';

export function populateWebsiteHeader(base_url) {
    if (base_url !== "") {
        $("#forWebsite").text(
            `for ${base_url.replace("https://", "").replace("www.", "")}`
        );
    }
}

export function populatePopup(ebayObject) {
    // If there are sellers in the ebay object, remove the default list item and add each seller in the list.
    if (ebayObject.sellers.length > 0) {
        $(".seller-list-group .default-list-item").remove();
        $.each(ebayObject.sellers, function (index, value) {
            addListItem(ebayObject, ".seller-list-group", value);
        });
    }

    // If there are items in the ebay object, remove the default list item and add each item in the list.
    if (ebayObject.items.length > 0) {
        $(".item-list-group .default-list-item").remove();
        $.each(ebayObject.items, function (index, value) {
            addListItem(ebayObject, ".item-list-group", value);
        });
    }

    // Update settings
    if (ebayObject.hideSponsored) {
        $('input[id="hideSponsoredCheck"]').prop("checked", true);
    }
    $('input[id="hideSponsoredCheck"]').on("change", async function () {
        try {
            const easyBlockStorageObject: EasyBlockStorageObject = await getEasyBlockStorageObject();
            easyBlockStorageObject.ebay.hideSponsored = $(this).is(":checked");
            await setEasyBlockStorageObject(easyBlockStorageObject);
            $("#refreshToApply").removeClass("d-none");
            console.log("easyBlockStorageObject updated and saved:", easyBlockStorageObject);
        } catch (error) {
            console.error('Failed to update and save easyBlockStorageObject:', error);
        }
    });

    if (ebayObject.hideSellersFewerThanReviews > 0) {
        $('input[id="hideFewerThanReviews"]').val(ebayObject.hideSellersFewerThanReviews);
    }
    $("#submitHideFewerThanReviews").on("click", async function () {
        try {
            const easyBlockStorageObject: EasyBlockStorageObject = await getEasyBlockStorageObject();
            easyBlockStorageObject.ebay.hideSellersFewerThanReviews = parseInt($("#hideFewerThanReviews")?.val()?.toString() ?? "0");
            await setEasyBlockStorageObject(easyBlockStorageObject);
            $("#refreshToApply").removeClass("d-none");
            console.log("easyBlockStorageObject updated and saved:", easyBlockStorageObject);
        } catch (error) {
            console.error('Failed to update and save easyBlockStorageObject:', error);
        }
    });

    if (ebayObject.hideSellersLowerThanReviews > 0) {
        $('input[id="hideLowerThanReviews"]').val(ebayObject.hideSellersLowerThanReviews);
    }
    $("#submitHideLowerThanReviews").on("click", async function () {
        try {
            const easyBlockStorageObject: EasyBlockStorageObject = await getEasyBlockStorageObject();
            easyBlockStorageObject.ebay.hideSellersLowerThanReviews = parseInt($("#hideLowerThanReviews")?.val()?.toString() ?? "0");
            await setEasyBlockStorageObject(easyBlockStorageObject);
            $("#refreshToApply").removeClass("d-none");
            console.log("easyBlockStorageObject updated and saved:", easyBlockStorageObject);
        } catch (error) {
            console.error('Failed to update and save easyBlockStorageObject:', error);
        }
    });

    document.getElementById("refreshToApply")?.addEventListener("click", () => {
        console.log("refreshing page");
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0].id) {
                chrome.tabs.reload(tabs[0].id);
            }
        });
    });
}

export function initializeHideAndUnhideButtons(ebayObject) {
    $(".list-group").on("click", ".remove-button", async function () {
        let listGroup = $(this).closest("ul");
        let listItem = $(this).parent().get(0);
        let removedValue = $(listItem).find("a").first().text();
        if ($(listGroup).hasClass("seller-list-group")) {
            ebayObject.sellers = $.grep(ebayObject.sellers, function (value) {
                return value != removedValue;
            });
        } else {
            ebayObject.items = $.grep(ebayObject.items, function (value) {
                return value != removedValue;
            });
        }
        try {
            const easyBlockStorageObject: EasyBlockStorageObject = await getEasyBlockStorageObject();
            easyBlockStorageObject.ebay.sellers = ebayObject.sellers;
            easyBlockStorageObject.ebay.items = ebayObject.items;
            await setEasyBlockStorageObject(easyBlockStorageObject);
            console.log("easyBlockStorageObject updated and saved:", easyBlockStorageObject);
        } catch (error) {
            console.error('Failed to update and save easyBlockStorageObject:', error);
        }
        $(listItem).remove();
        let listCount = $(listGroup).children().length;
        if (listCount === 0) {
            let message = $(listGroup).hasClass("seller-list-group") ? "No sellers hidden..." : "No items hidden...";
            $(listGroup).html('<li class="list-group-item align-items-center default-list-item">' + message + "</li>");
        }
        console.log("removed list item: " + removedValue);
    });

    $(".hide-button").on("click", function (e) {
        let inputGroup = $(this).closest(".input-group");
        let input = $(inputGroup).children("input").first();
        if ($(input).hasClass("userid-input")) {
            let value = $(input)?.val()?.toLowerCase();
            if (isValidUserID(ebayObject, inputGroup, value)) {
                completeListUpdate(ebayObject, ".seller-list-group", value);
                $(input).val("");
            }
        } else {
            let value = $(input).val();
            if (isValidItemNumber(ebayObject, inputGroup, value)) {
                completeListUpdate(ebayObject, ".item-list-group", value);
                $(input).val("");
            }
        }
    });
}

/********************************************************
 *             Seller & Item List Functions             *
 *******************************************************/


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
 * Returns false if the input is not a 12-digit number,
 * or if the item number already exists in the list.
 * Returns true if the input is valid.
 * @param {object} inputGroup The input group containing the text input field.
 * @param {string} itemNumber The text entered by the user.
 * @return {boolean} False if the input is invalid, true otherwise.
 */
function isValidItemNumber(ebayObject, inputGroup, itemNumber) {
    let feedbackDiv = $(inputGroup).siblings(".invalid-feedback").first();
    if (itemNumber.length !== 12 || !/^\d+$/.test(itemNumber)) {
        $("input", inputGroup).addClass("is-invalid");
        $(feedbackDiv).addClass("d-block").text("Please provide a valid eBay item number.");
        return false;
    } else if (ebayObject.items.includes(itemNumber)) {
        $("input", inputGroup).addClass("is-invalid");
        $(feedbackDiv).addClass("d-block").text("You have already added this item to the list.");
        return false;
    } else {
        $("input", inputGroup).removeClass("is-invalid");
        $(feedbackDiv).removeClass("d-block");
        return true;
    }
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
        console.log("easyBlockStorageObject updated and saved:", easyBlockStorageObject);
    } catch (error) {
        console.error('Failed to update and save easyBlockStorageObject:', error);
    }
}



/**
 * Adds a new list item to the list group specified by the selector.
 * The value parameter is the text of the new item.
 * @param {string} selector The selector of the list group to add the item to.
 * @param {string} value The text of the new item.
 */
function addListItem(ebayObject, selector, value) {
    let href = ebayObject.base_url === "" ? "https://ebay.com" : ebayObject.base_url;
    if ($(selector).hasClass("seller-list-group")) {
        href += "/usr/" + value;
    } else {
        href += "/itm/" + value;
    }
    let listItem =
        '<li class="list-group-item d-flex justify-content-between align-items-center">' +
        '<div class="link-container">' +
        '<a class="list-item-link text-danger" target="_blank" href="' +
        href +
        '">' +
        value +
        "</a>" +
        "</div>" +
        '<button type="button" name="remove" class="btn btn-outline-danger py-0 remove-button">x</button>' +
        "</li>";

    $(selector).append(listItem);
    console.log("added list item: " + value);
}
