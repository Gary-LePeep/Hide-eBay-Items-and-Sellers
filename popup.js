$(function() {

    let list = {
        sellers: [],
        items: [],
        ebayURL: ''
    };

    chrome.storage.local.get({
        list: list
    }, function(data) {
        list = data.list;
        if (list.sellers.length > 0) {
            $('.seller-list-group .default-list-item').remove();
            $.each(list.sellers, function(index, value) {
                addListItem('.seller-list-group', value);
            });
        }

        if (list.items.length > 0) {
            $('.item-list-group .default-list-item').remove();
            $.each(list.items, function(index, value) {
                addListItem('.item-list-group', value);
            });
        }
        console.log('list: ' + list.toString());
    });

    function updateStorageList() {
        chrome.storage.local.set({
            list: list
        }, function() {
            console.log('popup.js updated list:');
            console.log('sellers: ' + list.sellers);
            console.log('items: ' + list.items);
            console.log('ebayURL: ' + list.ebayURL);
        });
    }

    $('.list-group').on('click', '.remove-button', function() {
        let listGroup = $(this).closest('ul');
        let listItem = $(this).parent().get(0);
        let removedValue = $(listItem).find('a').first().text();
        if ($(listGroup).hasClass('seller-list-group')) {
            list.sellers = $.grep(list.sellers, function(value) {
                return value != removedValue;
            });
        } else {
            list.items = $.grep(list.items, function(value) {
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
        console.log('removed list item: '  + removedValue);
    });

    function isValidUserID(inputGroup, userID) {
        let feedbackDiv = $(inputGroup).siblings('.invalid-feedback').first();
        if ((/[%\s\/]/.test(userID)) || (userID.length < 1) || (userID.length > 64)) {
            $('input', inputGroup).addClass('is-invalid');
            $(feedbackDiv).addClass('d-block').text('Please provide a valid eBay seller user ID.');
            return false;
        } else if (list.sellers.includes(userID)) {
            $('input', inputGroup).addClass('is-invalid');
            $(feedbackDiv).addClass('d-block').text('You have already added this seller to the list.');
            return false;
        } else {
            $('input', inputGroup).removeClass('is-invalid');
            $(feedbackDiv).removeClass('d-block');
            return true;
        }
    }

    function isValidItemNumber(inputGroup, itemNumber) {
        let feedbackDiv = $(inputGroup).siblings('.invalid-feedback').first();
        if (itemNumber.length !== 12 || !/^\d+$/.test(itemNumber)) {
            $('input', inputGroup).addClass('is-invalid');
            $(feedbackDiv).addClass('d-block').text('Please provide a valid eBay item number.');
            return false;
        } else if (list.items.includes(itemNumber)) {
            $('input', inputGroup).addClass('is-invalid');
            $(feedbackDiv).addClass('d-block').text('You have already added this item to the list.');
            return false;
        } else  {
            $('input', inputGroup).removeClass('is-invalid');
            $(feedbackDiv).removeClass('d-block');
            return true;
        }
    }

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
            list.sellers.push(value);
        } else {
            list.items.push(value);
        }
        updateStorageList();
    }

    $('.hide-button').click(function(e) {
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

    function addListItem(selector, value) {
        let href = (list.ebayURL === '') ? 'https://ebay.com' : list.ebayURL;
        if ($(selector).hasClass('seller-list-group')) {
            href += '/usr/' + value;
        } else  {
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
