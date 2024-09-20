$(function () {
    /********************************************************
     *                   Browser Storage                    *
     *******************************************************/

    let easyBlockStorageObject = {
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
        easyBlockStorageObject: easyBlockStorageObject
    }, function (data) {
        easyBlockStorageObject = data.easyBlockStorageObject;
        // Populate header website
        console.warn(JSON.stringify(easyBlockStorageObject));
        if (easyBlockStorageObject.ebay.base_url !== '') {
            $('#forWebsite').text(`for ${easyBlockStorageObject.ebay.base_url.replace('https://', '').replace('www.', '')}`);
        }

        // If there are sellers in the ebay object, remove the default list item and add each seller in the list.
        if (easyBlockStorageObject.ebay.sellers.length > 0) {
            $('.seller-list-group .default-list-item').remove();
            $.each(easyBlockStorageObject.ebay.sellers, function (index, value) {
                addListItem('.seller-list-group', value);
            });
        }

        // If there are items in the ebay object, remove the default list item and add each item in the list.
        if (easyBlockStorageObject.ebay.items.length > 0) {
            $('.item-list-group .default-list-item').remove();
            $.each(easyBlockStorageObject.ebay.items, function (index, value) {
                addListItem('.item-list-group', value);
            });
        }

        // Update settings
        if (easyBlockStorageObject.ebay.hideSponsored) {
            $('input[id="hideSponsoredCheck"]').prop('checked', true);
        }

        if (easyBlockStorageObject.ebay.hideSellersFewerThanReviews > 0) {
            $('input[id="hideFewerThanReviews"]').val(easyBlockStorageObject.ebay.hideSellersFewerThanReviews);
        }

        if (easyBlockStorageObject.ebay.hideSellersLowerThanReviews > 0) {
            $('input[id="hideLowerThanReviews"]').val(easyBlockStorageObject.ebay.hideSellersLowerThanReviews);
        }
    });

    /**
     * Saves the storage object to local storage.
     */
    function updateStorageList() {
        chrome.storage.local.set({
            easyBlockStorageObject: easyBlockStorageObject
        }, function () {
            console.log('popup.js updated easyBlockStorageObject:', JSON.stringify(easyBlockStorageObject));
        });
    }

    /********************************************************
     *                      Settings                        *
     *******************************************************/

    $('input[id="hideSponsoredCheck"]').on('change', function () {
        easyBlockStorageObject.ebay.hideSponsored = $(this).is(':checked');
        updateStorageList();
    })

    $('input[id="submitHideFewerThanReviews"]').on('click', function () {
        easyBlockStorageObject.ebay.hideSellersFewerThanReviews = parseInt($('input[id="hideFewerThanReviews"]').val().toString());
        updateStorageList();
    })

    $('input[id="submitHideLowerThanReviews"]').on('click', function () {
        easyBlockStorageObject.ebay.hideSellersLowerThanReviews = parseInt($('input[id="hideLowerThanReviews"]').val().toString());
        updateStorageList();
    })

    /********************************************************
     *             Seller & Item List Functions             *
     *******************************************************/

    /**
     * When the user clicks on the remove button, the item is removed from the list and the storage object is updated.
     */
    $('.list-group').on('click', '.remove-button', function () {
        let listGroup = $(this).closest('ul');
        let listItem = $(this).parent().get(0);
        let removedValue = $(listItem).find('a').first().text();
        if ($(listGroup).hasClass('seller-list-group')) {
            easyBlockStorageObject.ebay.sellers = $.grep(easyBlockStorageObject.ebay.sellers, function (value) {
                return value != removedValue;
            });
        } else {
            easyBlockStorageObject.ebay.items = $.grep(easyBlockStorageObject.ebay.items, function (value) {
                return value != removedValue;
            });
        }
        updateStorageList();
        $(listItem).remove();
        let listCount = $(listGroup).children().length;
        if (listCount === 0) {
            let message = ($(listGroup).hasClass('seller-list-group')) ? 'No sellers hidden...' : 'No items hidden...';
            $(listGroup).html('<li class="list-group-item align-items-center default-list-item">' + message + '</li>');
        }
        console.log('removed list item: ' + removedValue);
    });

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
    function isValidUserID(inputGroup, userID) {
        let feedbackDiv = $(inputGroup).siblings('.invalid-feedback').first();
        if ((/[%\s\/]/.test(userID)) || (userID.length < 1) || (userID.length > 64)) {
            $('input', inputGroup).addClass('is-invalid');
            $(feedbackDiv).addClass('d-block').text('Please provide a valid eBay seller user ID.');
            return false;
        } else if (easyBlockStorageObject.ebay.sellers.includes(userID)) {
            $('input', inputGroup).addClass('is-invalid');
            $(feedbackDiv).addClass('d-block').text('You have already added this seller to the list.');
            return false;
        } else {
            $('input', inputGroup).removeClass('is-invalid');
            $(feedbackDiv).removeClass('d-block');
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
    function isValidItemNumber(inputGroup, itemNumber) {
        let feedbackDiv = $(inputGroup).siblings('.invalid-feedback').first();
        if (itemNumber.length !== 12 || !/^\d+$/.test(itemNumber)) {
            $('input', inputGroup).addClass('is-invalid');
            $(feedbackDiv).addClass('d-block').text('Please provide a valid eBay item number.');
            return false;
        } else if (easyBlockStorageObject.ebay.items.includes(itemNumber)) {
            $('input', inputGroup).addClass('is-invalid');
            $(feedbackDiv).addClass('d-block').text('You have already added this item to the list.');
            return false;
        } else {
            $('input', inputGroup).removeClass('is-invalid');
            $(feedbackDiv).removeClass('d-block');
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
    function completeListUpdate(listGroup, value) {
        if ($(listGroup).children().length === 1) {
            let listItem = $(listGroup).children().first();
            if ($(listItem).hasClass('default-list-item')) {
                $(listItem).remove();
            }
        }
        addListItem(listGroup, value);
        let bottom = $('li:last-child', listGroup).offset().top;
        $('li:last-child', listGroup).scrollTop(bottom);
        if ($(listGroup).hasClass('seller-list-group')) {
            easyBlockStorageObject.ebay.sellers.push(value);
        } else {
            easyBlockStorageObject.ebay.items.push(value);
        }
        updateStorageList();
    }

    $('.hide-button').click(function (e) {
        let inputGroup = $(this).closest('.input-group');
        let input = $(inputGroup).children('input').first();
        if ($(input).hasClass('userid-input')) {
            let value = $(input).val().toLowerCase();
            if (isValidUserID(inputGroup, value)) {
                completeListUpdate('.seller-list-group', value);
                $(input).val('');
            }
        } else {
            let value = $(input).val();
            if (isValidItemNumber(inputGroup, value)) {
                completeListUpdate('.item-list-group', value);
                $(input).val('');
            }
        }
    });

    /**
     * Adds a new list item to the list group specified by the selector.
     * The value parameter is the text of the new item.
     * @param {string} selector The selector of the list group to add the item to.
     * @param {string} value The text of the new item.
     */
    function addListItem(selector, value) {
        let href = (easyBlockStorageObject.ebay.base_url === '') ? 'https://ebay.com' : easyBlockStorageObject.ebay.base_url;
        if ($(selector).hasClass('seller-list-group')) {
            href += '/usr/' + value;
        } else {
            href += '/itm/' + value;
        }
        let listItem = '<li class="list-group-item d-flex justify-content-between align-items-center">' +
            '<div class="link-container">' +
            '<a class="list-item-link text-danger" target="_blank" href="' + href + '">' + value + '</a>' +
            '</div>' +
            '<button type="button" name="remove" class="btn btn-outline-danger py-0 remove-button">x</button>' +
            '</li>';

        $(selector).append(listItem);
        console.log('added list item: ' + value);
    }
});
