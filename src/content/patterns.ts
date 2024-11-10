import { testEbayPattern } from "../../test/patterns";
import { testAmazonPattern } from "../../test/patterns";
import { testGooglePattern } from "../../test/patterns";

export interface EbayPattern {
    base: RegExp,
    searchPage: RegExp,
    itemPage: RegExp,
    userPage: RegExp
}
export interface AmazonPattern {
    base: RegExp,
    searchPage: RegExp,
    itemPage: RegExp
}

export interface GooglePattern {
    base: RegExp,
    searchPage: RegExp
}

export const ebayPattern: EbayPattern = {
    base: new RegExp(`(^https:\/\/(.+?\.)?ebay\.|${testEbayPattern.base})`),
    searchPage: new RegExp(`(^https:\/\/(.+?\.)?ebay\..+?\/(sch|b)\/.+|${testEbayPattern.searchPage})`),
    itemPage: new RegExp(`(^https:\/\/(.+?\.)?ebay\..+?\/(itm|p)\/.+|${testEbayPattern.itemPage})`),
    userPage: new RegExp(`(^https:\/\/(.+?\.)?ebay\..+?\/(usr|str)\/.+|${testEbayPattern.userPage})`)
}
export const amazonPattern: AmazonPattern = {
    base: new RegExp(`(^https:\/\/(.+?\.)?amazon\.|${testAmazonPattern.base})`),
    searchPage: new RegExp(`(^https:\/\/(.+?\.)?amazon\..+?\/s|${testAmazonPattern.searchPage})`),
    itemPage: new RegExp(`(^https:\/\/(.+?\.)?amazon\..+?\/dp\/.+|${testAmazonPattern.itemPage})`)
}

export const googlePattern: GooglePattern = {
    base: new RegExp(`(^https:\/\/(.+?\.)?google\.|${testGooglePattern.base})`),
    searchPage: new RegExp(`(^https:\/\/(.+?\.)?google.+\/.+[?|&]udm=28.*|${testGooglePattern.searchPage})`)
}
