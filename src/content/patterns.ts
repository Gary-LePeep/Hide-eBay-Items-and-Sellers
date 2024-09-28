export interface EbayPattern {
    base: RegExp,
    searchPage: RegExp,
    itemPage: RegExp,
    userPage: RegExp
}

export const ebayPattern: EbayPattern = {
    base: new RegExp("^https:\/\/(.+?\.)?ebay\."),
    searchPage: new RegExp("^https:\/\/(.+?\.)?ebay\..+?\/(sch|b)\/.+"),
    itemPage: new RegExp("^https:\/\/(.+?\.)?ebay\..+?\/(itm|p)\/.+"),
    userPage: new RegExp("^https:\/\/(.+?\.)?ebay\..+?\/(usr|str)\/.+")
}
