# focalStorage

focalStorage is a Promise-based, localStorage-like wrapper around asynchronous
IndexedDB storage.

focalStorage works wherever IndexedDB is supported. localStorage fallback coming soon.

To use focalStorage, just drop a single JavaScript file into your page:

```html
<script src="focalStorage.js"></script>
<script>focalStorage.getItem('something', myCallback);</script>
```

Download the [latest focalStorage from GitHub](https://github.com/cvan/focalStorage/releases/latest), or install with [npm](https://www.npmjs.org/):

```bash
npm install focalStorage
```

focalStorage is compatible with [browserify](http://browserify.org/).


## How to use focalStorage

Because focalStorage uses async storage, it has an async API.
It's otherwise exactly the same as the
[Local Storage API](https://hacks.mozilla.org/2009/06/localstorage/).

focalStorage relies on native [ES6 Promises](http://www.promisejs.org/), but
[ships with an awesome polyfill](https://github.com/jakearchibald/ES6-Promises)
for browsers that don't support ES6 Promises yet.

Don't expect a return value from calls to `focalStorage.getItem()`. Instead,
use Promises:

```js
// Synchronous; slower!
var value = JSON.parse(localStorage.getItem('key'));
console.log(value);

// Async, fast, and non-blocking!
focalStorage.setItem('key', 'value').then(function (value) {
  console.log(value + ' was set!');
}, function (error) {
  console.error(error);
});
```

### Configuration

You can set database information with the `focalStorage.config` method.
Available options are `driver`, `name`, `version`, and `storeName`.

Example:

```js
focalStorage.config({
  driver: focalStorage.INDEXEDDB,  // Force IndexedDB. Or `focalStorage.INDEXEDDB` for localStorage.
  name: 'myApp',
  version: 1.0,
  storeName: 'keyvaluepairs',  // Limit to alphanumeric characters and underscores.
});
```

**Note:** you must call `config()` _before_ you interact with your data. This
means calling `config()` before using `getItem()`, `setItem()`, `removeItem()`,
`clear()`, `key()`, `keys()` or `length()`.


## Working on focalStorage

You'll need [Node + npm](http://nodejs.org/).

To work on focalStorage, you should start by
[forking it](https://github.com/cvan/focalStorage/fork) and installing its
dependencies. Replace `USERNAME` with your GitHub username and run the
following:

```bash
git clone git@github.com:USERNAME/focalStorage.git
cd focalStorage
npm install
```

### Building the bundle

Run this command to compile the JavaScript as a standalone module to __`dist/focalStorage.js`__:

    npm run build


## Maintainers

Run this command to publish a new tag to GitHub and version to npm:

    npm run release


## Licence

This program is free software and is distributed under an
[MIT License](https://github.com/cvan/focalStorage/blob/master/LICENSE).
