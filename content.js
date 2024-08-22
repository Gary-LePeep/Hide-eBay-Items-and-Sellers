//debugger;

let list = {
    sellers: [],
    items: [],
    ebayURL: ''
};

chrome.storage.local.get({
    list: list
}, function(data) {
    list = data.list;
    checkPageContent();
});

chrome.storage.onChanged.addListener(function(changes, namespace) {
    for (var key in changes) {
        if (key === 'list') {
            list = changes[key].newValue;
        }
    }
});

function getItemNumber(href) {
    let matchedArr = href.match(/^.+?itm\/(\d{12}).+$/) || href.match(/^.+?iid=(\d{12}).*$/) || [''];
    if (matchedArr.length > 1 && matchedArr[1].length === 12 && /^\d+$/.test(matchedArr[1])) {
        return matchedArr[1];
    }  else {
        return '';
    }
}

function checkPageContent() {
    if (/^https:\/\/(www|.+?|www\..+?)\.ebay\..+?\/(sch|b)\/.+/.test(window.location.href)) {

        let ulLists = ['ul.srp-results', 'ul#ListViewInner', 'ul.b-list__items_nofooter'];
        var currentList = null;
        for (var item in ulLists) {
            if (ulLists.hasOwnProperty(item)) {
                if ($(ulLists[item]).length) {
                    currentList = $(ulLists[item]);
                    break;
                }
            }
        }

        //if ($('ul.srp-results.srp-list').length || $('ul.ListViewInner').length || $('ul.b-list__items_nofooter').length) {
        if (currentList) {
            console.log('has list');
            //let ul = ($('ul.srp-results.srp-list').length) ? $('ul.srp-results.srp-list')[0] : $('ul.b-list__items_nofooter')[0];
            let ul = currentList[0];
            //let divSelecter = 'li .s-item__wrapper';
            let divSelecter = (currentList.attr('id') === 'ListViewInner') ? 'li.sresult' : 'li .s-item__wrapper';
            let classList = 'hide-item-button eh-not-hidden';
            insertButton(30, 'Hide item from search results.', classList, $(divSelecter, ul));
            if (currentList.attr('id') === 'ListViewInner') {
                console.log('searching list items');
                $('li.sresult', ul).each(function() {
                    let itemNumber = $(this).attr('listingid');
                    if (itemNumber !== '' && list.items.includes(itemNumber)) {
                        $(this).closest('li').remove();
                    }
                });
            } else {
                $('li .s-item__info .s-item__link', ul).each(function() {
                    let itemNumber = getItemNumber($(this).attr('href'));
                    if (itemNumber !== '' && list.items.includes(itemNumber)) {
                        $(this).closest('li').remove();
                    }
                });
            }
            $(divSelecter, ul).on('click', '.hide-item-button', hideItem);
        }
        //}
    } else if (/^https:\/\/(www|.+?|www\..+?)\.ebay\..+?\/(itm|p)\/.+/.test(window.location.href)) {
        if ($('.si-cnt .bdg-90').length || $('.item-cta-wrapper .seller-details').length) {
            let sellerInfoDiv = ($('.si-cnt .bdg-90').length) ? $('.si-cnt .bdg-90')[0] : $('.item-cta-wrapper .seller-details')[0];
            let sellerUserID = '';
            if ($(sellerInfoDiv).hasClass('.bdg-90')) {
                sellerUserID = $(sellerInfoDiv).find('.mbg .mbg-nw').text();
            } else {
                sellerUserID = $(sellerInfoDiv).find('a').first().text();
            }
            sellerUserID = sellerUserID.replace(/\s+/g,'');
            let classList = 'hide-seller-button';
            if (list.sellers.includes(sellerUserID)) {
                classList += ' eh-is-hidden';
            } else {
                classList += ' eh-not-hidden';
            }
            insertButton(22, 'Hide seller\'s items from search results.', classList, sellerInfoDiv);
            $(sellerInfoDiv).on('click', '.hide-seller-button', function() {
                $(this).toggleClass('eh-is-hidden eh-not-hidden');
                updateSellerHiddenStatus(sellerUserID);
            });
        }
    } else if (/^https:\/\/(www|.+?|www\..+?)\.ebay\..+?\/usr\/.+/.test(window.location.href)) {
        if ($('#followBtn').length) {
            let buttonsDiv = $('#followBtn')[0]
            let sellerUserID = $('#user_info .mbg-id').contents().filter((i, el) => el.nodeType === 3).text();
            sellerUserID = sellerUserID.replace(/\s+/g,'');
            let classList = 'hide-seller-profile-button';
            if (list.sellers.includes(sellerUserID)) {
                classList += ' eh-is-hidden';
            } else {
                classList += ' eh-not-hidden';
            }
            insertButton(22, 'Hide seller\'s items from search results.', classList, buttonsDiv);
            $(buttonsDiv).on('click', '.hide-seller-profile-button', function() {
                $(this).toggleClass('eh-is-hidden eh-not-hidden');
                updateSellerHiddenStatus(sellerUserID);
            });
        }
    }
}

function hideItem() {
    var itemNumber = '';
    var itemName = '';
    if ($(this).parent('li').hasClass('sresult')) {
        itemNumber = $(this).parent('li.sresult').attr('listingid');
        itemName = $(this).siblings('h3').first().children('a').first().text();
    } else {
        let a = $(this).siblings('.s-item__info').first().children('.s-item__link').first();
        itemNumber = getItemNumber($(a).attr('href'));
        itemName = $(this).siblings('.s-item__info').first().children('a').first().children('h3').first().text();
    }
    if (itemNumber !== '') {
        if (!list.items.includes(itemNumber)) {
            list.items.push(itemNumber);
        }
        updateStorageList();
    }
    $(this).closest('li').remove();
    console.log('item number ' + itemNumber + ' was hidden');
}

function updateSellerHiddenStatus(sellerUserID) {
    console.log('updating seller status');
    console.log(sellerUserID);
    if (list.sellers.includes(sellerUserID)) {
        list.sellers = $.grep(list.sellers, function(value) {
            return value != sellerUserID;
        });
    } else {
        list.sellers.push(sellerUserID);
    }
    updateStorageList();
}

function insertButton(size, title, classList, contSelecter) {
    let input = $('<input/>', {
        "class": classList,
        type: 'image',
        width: size,
        height: size,
        title: title,
        alt: 'Hide',
        src: chrome.runtime.getURL('icon48.png'),
    });
    console.log('selector: ' + contSelecter);
    $(contSelecter).append(input);
    console.log('inserted button...');
}

function updateStorageList() {
    chrome.storage.local.set({
        list: list
    }, function() {
        console.log('content.js updated list.');
    });
}
