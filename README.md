# Hide eBay Items and Sellers

### A browser extension that allows you to hide items and sellers from your eBay search and category results.

This extension allows you to permanently hide items from appearing in your search results and while browsing the categories on eBay. Simply click the button on the right side of an item and it will remain hidden until you unhide it from the extension popup. You can also hide all items from a specific seller by clicking the button in the "seller information" box on the item page.

Why is this extension helpful? Well currently you can't hide individual items on eBay. You can exclude all items from specific sellers using the filter options but this is not persistent, so you either have to re-enter the filter options every time you start searching eBay or use a saved search. This extension makes it simple and easy by allowing you to hide individual items or all items from a specific seller at the click of a button.

## Features

- Hide items in your search feed instantly with the click of a button.
- Hide sellers by browsing to the item or their user page. No items from that seller will ever show up in your searches again!
- Synchronize the list of blocked sellers and items across devices that are using the same browser and account.

## Future Plans

- Setting to hide sellers with low ratings
- Setting to hide sellers with low review count
- Setting to optionally hide sponsored items
- Eventually expand to other sites, eg. Amazon, BestBuy, Adorama...
- Eventually expand to other browsers, eg. Edge, Safari...

## Contributing
Contributions are welcome! If you'd like to contribute to the project, please clone the repository and submit a pull request with your changes.

## Support
If you have any questions or need help, please [open an issue](https://github.com/ebay-hide-items-and-sellers/ebay-hide-items-and-sellers/issues) or send me an email at [my masked email address](mailto:n7bvdoj73@mozmail.com).

## Running locally
You must have npm installed to transpile the typescript files.

Once you have cloned the repository, run `npm install` to install the dependencies.

When you make any changes, run `npm build`. This command will:

1. Delete the `dist` folder if it exists
2. Transpile the typescript files to the `dist` folder
3. Copy the other assets to the `dist` folder

Then, load the `dist` folder in your browser as a developer extension.

## License
This project is licensed under the Mozilla Public License (MPL) version 2.0