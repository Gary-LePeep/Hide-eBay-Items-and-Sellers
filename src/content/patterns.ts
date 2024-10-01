import { testEbayPattern } from "../../test/patterns";

export interface EbayPattern {
    base: RegExp,
    searchPage: RegExp,
    itemPage: RegExp,
    userPage: RegExp
}

export const ebayPattern: EbayPattern = {
    base: new RegExp(`(^https:\/\/(.+?\.)?ebay\.|${testEbayPattern.base})`),
    searchPage: new RegExp(`(^https:\/\/(.+?\.)?ebay\..+?\/(sch|b)\/.+|${testEbayPattern.searchPage})`),
    itemPage: new RegExp(`(^https:\/\/(.+?\.)?ebay\..+?\/(itm|p)\/.+|${testEbayPattern.itemPage})`),
    userPage: new RegExp(`(^https:\/\/(.+?\.)?ebay\..+?\/(usr|str)\/.+|${testEbayPattern.userPage})`)
}
