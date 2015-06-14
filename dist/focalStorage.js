(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.focalStorage = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
/* globals indexedDB */
/**
 * focalStorage
 *
 * A Promise-based, localStorage-like wrapper around IndexedDB.
 *
 * -
 *
 * Borrowed lots of code from
 *
 * https://github.com/mozilla/localForage/blob/080f665/src/drivers/indexeddb.js and
 * https://github.com/mozilla-b2g/gaia/blob/12d71f3/shared/js/async_storage.js
 *
 * -
 *
 * This file defines an asynchronous version of the localStorage API, backed by
 * an IndexedDB database. It creates a focalStorage object that has methods
 * like the localStorage object's.
 *
 * To store a value use setItem:
 *
 *   focalStorage.setItem('key', 'value');
 *
 * If you want confirmation that the value has been stored, pass a callback
 * function as the third argument:
 *
 *  focalStorage.setItem('key', 'newvalue').then(function () {
 *    console.log('new value stored');
 *  });
 *
 * To read a value, call getItem(), but note that you must supply a callback
 * function that the value will be passed to asynchronously:
 *
 *  focalStorage.getItem('key').then(function (value) {
 *    console.log('The value of key is:', value);
 *  });
 *
 * Note that unlike localStorage, focalStorage does not allow you to store and
 * retrieve values by setting and querying properties directly. You cannot just
 * write focalStorage.key; you have to explicitly call setItem() or getItem().
 *
 * removeItem(), clear(), length(), and key() are like the same-named methods of
 * localStorage, but, like getItem() and setItem() they take a callback
 * argument.
 *
 * The asynchronous nature of getItem() makes it tricky to retrieve multiple
 * values. But unlike localStorage, focalStorage does not require the values you
 * store to be strings. So if you need to save multiple values and want to
 * retrieve them together, in a single asynchronous operation, just group the
 * values into a single object. The properties of this object may not include
 * DOM elements, but they may include things like Blobs and typed arrays.
 */

'use strict';

var db = null;

function openDatabase() {
  return new Promise(function (resolve, reject) {
    if (db) {
      resolve(db);
      return;
    }

    var openreq = indexedDB.open(focalStorage.settings.name, focalStorage.settings.version);

    openreq.onsuccess = function () {
      db = openreq.result;
      resolve(db);
    };

    openreq.onupgradeneeded = function () {
      // First time setup: create an empty object store.
      openreq.result.createObjectStore(focalStorage.settings.storeName);
    };

    openreq.onerror = function () {
      reject(openreq.error);
    };
  });
}

function openStore(type) {
  return openDatabase().then(function () {
    var transaction = db.transaction(focalStorage.settings.storeName, type);

    return transaction.objectStore(focalStorage.settings.storeName);
  });
}

function openTransaction(type) {
  return openDatabase().then(function () {
    return db.transaction(focalStorage.settings.storeName, type);
  });
}

function getItem(key) {
  return new Promise(function (resolve, reject) {
    return openStore('readonly').then(function (store) {
      var req = store.get(key);

      req.onsuccess = function () {
        var value = req.result;
        if (value === undefined) {
          value = null;
        }

        resolve(value);
      };

      req.onerror = function () {
        reject(req.error);
      };
    })['catch'](reject);
  });
}

function setItem(key, value) {
  return new Promise(function (resolve, reject) {
    return openTransaction('readwrite').then(function (transaction) {

      var store = transaction.objectStore(focalStorage.settings.storeName);

      // Cast the key to a string, as that's all we can set as a key.
      if (typeof key !== 'string') {
        console.warn(key + ' used as a key, but it is not a string');
        key = String(key);
      }

      // The reason we don't _save_ null is because IE 10 does
      // not support saving the `null` type in IndexedDB.
      if (value === null) {
        value = undefined;
      }

      var req = store.put(value, key);

      transaction.oncomplete = function () {
        // Cast to undefined so the value passed to
        // callback/promise is the same as what one would get out
        // of `getItem()` later. This leads to some weirdness
        // (setItem('foo', undefined) will return `null`), but
        // it's not my fault localStorage is our baseline and that
        // it's weird.
        if (value === undefined) {
          value = null;
        }

        resolve(value);
      };

      transaction.onabort = transaction.onerror = function () {
        reject(req.error ? req.error : req.transaction.error);
      };
    })['catch'](reject);
  });
}

function removeItem(key) {
  return new Promise(function (resolve, reject) {
    return openTransaction('readwrite').then(function (transaction) {
      var store = transaction.objectStore(focalStorage.settings.storeName);

      // Cast the key to a string, as that's all we can set as a key.
      if (typeof key !== 'string') {
        console.warn(key + ' used as a key, but it is not a string');
        key = String(key);
      }

      var req = store['delete'](key);

      transaction.oncomplete = function () {
        resolve();
      };

      transaction.onerror = function () {
        reject(req.error);
      };

      // The request will also be aborted if storage space is exceeded.
      transaction.onabort = function () {
        reject(req.error ? req.error : req.transaction.error);
      };
    })['catch'](reject);
  });
}

function clear() {
  return new Promise(function (resolve, reject) {
    return openTransaction('readwrite').then(function (transaction) {
      var store = transaction.objectStore(focalStorage.settings.storeName);

      var req = store.clear();

      transaction.oncomplete = function () {
        resolve();
      };

      transaction.onabort = transaction.onerror = function () {
        reject(req.error ? req.error : req.transaction.error);
      };
    })['catch'](reject);
  });
}

function length(callback) {
  return new Promise(function (resolve, reject) {
    openStore('readonly').then(function (store) {
      var req = store.count();

      req.onsuccess = function () {
        resolve(req.result);
      };

      req.onerror = function () {
        reject(req.error);
      };
    })['catch'](reject);
  });
}

function key(n) {
  return new Promise(function (resolve, reject) {
    if (n < 0) {
      resolve(null);
      return;
    }

    return openStore('readonly').then(function (store) {
      var advanced = false;
      var req = store.openCursor();

      req.onsuccess = function () {
        var cursor = req.result;

        if (!cursor) {
          // This means there weren't enough keys.
          resolve(null);
          return;
        }

        if (n === 0) {
          // We have the first key; return it if that's what they wanted.
          resolve(cursor.key);
        } else {
          if (!advanced) {
            // Otherwise, ask the cursor to skip ahead `n` records.
            advanced = true;
            cursor.advance(n);
          } else {
            // When we get here, we've got the nth key.
            resolve(cursor.key);
          }
        }
      };

      req.onerror = function () {
        reject(req.error);
      };
    })['catch'](reject);
  });
}

function keys() {
  return new Promise(function (resolve, reject) {
    return openStore('readonly').then(function (store) {
      var req = store.openCursor();
      var keys = [];

      req.onsuccess = function () {
        var cursor = req.result;

        if (!cursor) {
          resolve(keys);
          return;
        }

        keys.push(cursor.key);
        cursor['continue']();
      };

      req.onerror = function () {
        reject(req.error);
      };
    })['catch'](reject);
  });
}

/**
 * Assigns configurations.
 * @param {Object} settings Options object to use for `focalStorage` instance.
 */
function config(settings) {
  focalStorage.settings = Object.assign({}, DEFAULT_SETTINGS, settings || {});
}

var focalStorage = {
  INDEXEDDB: 0,
  LOCALSTORAGE: 1,
  getItem: getItem,
  setItem: setItem,
  removeItem: removeItem,
  clear: clear,
  length: length,
  key: key,
  keys: keys
};

var DEFAULT_SETTINGS = {
  driver: focalStorage.indexedDB,
  name: 'focalStorage',
  version: 1,
  storeName: 'keyvaluepairs' };

focalStorage.settings = DEFAULT_SETTINGS;

exports['default'] = focalStorage;
module.exports = exports['default'];

},{}],2:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _libFocalStorageJs = require('./lib/focalStorage.js');

var _libFocalStorageJs2 = _interopRequireDefault(_libFocalStorageJs);

exports['default'] = _libFocalStorageJs2['default'];
module.exports = exports['default'];

},{"./lib/focalStorage.js":1}]},{},[2])(2)
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvb3B0L2ZvY2FsU3RvcmFnZS9zcmMvbGliL2ZvY2FsU3RvcmFnZS5qcyIsIi9vcHQvZm9jYWxTdG9yYWdlL3NyYy9pbmRleC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUNxREEsWUFBWSxDQUFDOztBQUViLElBQUksRUFBRSxHQUFHLElBQUksQ0FBQzs7QUFFZCxTQUFTLFlBQVksR0FBRztBQUN0QixTQUFPLElBQUksT0FBTyxDQUFDLFVBQVUsT0FBTyxFQUFFLE1BQU0sRUFBRTtBQUM1QyxRQUFJLEVBQUUsRUFBRTtBQUNOLGFBQU8sQ0FBQyxFQUFFLENBQUMsQ0FBQztBQUNaLGFBQU87S0FDUjs7QUFFRCxRQUFJLE9BQU8sR0FBRyxTQUFTLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUMxQixZQUFZLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDOztBQUU1RCxXQUFPLENBQUMsU0FBUyxHQUFHLFlBQVk7QUFDOUIsUUFBRSxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUM7QUFDcEIsYUFBTyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0tBQ2IsQ0FBQzs7QUFFRixXQUFPLENBQUMsZUFBZSxHQUFHLFlBQVk7O0FBRXBDLGFBQU8sQ0FBQyxNQUFNLENBQUMsaUJBQWlCLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsQ0FBQztLQUNuRSxDQUFDOztBQUVGLFdBQU8sQ0FBQyxPQUFPLEdBQUcsWUFBWTtBQUM1QixZQUFNLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDO0tBQ3ZCLENBQUM7R0FDSCxDQUFDLENBQUM7Q0FDSjs7QUFFRCxTQUFTLFNBQVMsQ0FBQyxJQUFJLEVB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QUF1QiIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIvKiBnbG9iYWxzIGluZGV4ZWREQiAqL1xuLyoqXG4gKiBmb2NhbFN0b3JhZ2VcbiAqXG4gKiBBIFByb21pc2UtYmFzZWQsIGxvY2FsU3RvcmFnZS1saWtlIHdyYXBwZXIgYXJvdW5kIEluZGV4ZWREQi5cbiAqXG4gKiAtXG4gKlxuICogQm9ycm93ZWQgbG90cyBvZiBjb2RlIGZyb21cbiAqXG4gKiBodHRwczovL2dpdGh1Yi5jb20vbW96aWxsYS9sb2NhbEZvcmFnZS9ibG9iLzA4MGY2NjUvc3JjL2RyaXZlcnMvaW5kZXhlZGRiLmpzIGFuZFxuICogaHR0cHM6Ly9naXRodWIuY29tL21vemlsbGEtYjJnL2dhaWEvYmxvYi8xMmQ3MWYzL3NoYXJlZC9qcy9hc3luY19zdG9yYWdlLmpzXG4gKlxuICogLVxuICpcbiAqIFRoaXMgZmlsZSBkZWZpbmVzIGFuIGFzeW5jaHJvbm91cyB2ZXJzaW9uIG9mIHRoZSBsb2NhbFN0b3JhZ2UgQVBJLCBiYWNrZWQgYnlcbiAqIGFuIEluZGV4ZWREQiBkYXRhYmFzZS4gSXQgY3JlYXRlcyBhIGZvY2FsU3RvcmFnZSBvYmplY3QgdGhhdCBoYXMgbWV0aG9kc1xuICogbGlrZSB0aGUgbG9jYWxTdG9yYWdlIG9iamVjdCdzLlxuICpcbiAqIFRvIHN0b3JlIGEgdmFsdWUgdXNlIHNldEl0ZW06XG4gKlxuICogICBmb2NhbFN0b3JhZ2Uuc2V0SXRlbSgna2V5JywgJ3ZhbHVlJyk7XG4gKlxuICogSWYgeW91IHdhbnQgY29uZmlybWF0aW9uIHRoYXQgdGhlIHZhbHVlIGhhcyBiZWVuIHN0b3JlZCwgcGFzcyBhIGNhbGxiYWNrXG4gKiBmdW5jdGlvbiBhcyB0aGUgdGhpcmQgYXJndW1lbnQ6XG4gKlxuICogIGZvY2FsU3RvcmFnZS5zZXRJdGVtKCdrZXknLCAnbmV3dmFsdWUnKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAqICAgIGNvbnNvbGUubG9nKCduZXcgdmFsdWUgc3RvcmVkJyk7XG4gKiAgfSk7XG4gKlxuICogVG8gcmVhZCBhIHZhbHVlLCBjYWxsIGdldEl0ZW0oKSwgYnV0IG5vdGUgdGhhdCB5b3UgbXVzdCBzdXBwbHkgYSBjYWxsYmFja1xuICogZnVuY3Rpb24gdGhhdCB0aGUgdmFsdWUgd2lsbCBiZSBwYXNzZWQgdG8gYXN5bmNocm9ub3VzbHk6XG4gKlxuICogIGZvY2FsU3RvcmFnZS5nZXRJdGVtKCdrZXknKS50aGVuKGZ1bmN0aW9uICh2YWx1ZSkge1xuICogICAgY29uc29sZS5sb2coJ1RoZSB2YWx1ZSBvZiBrZXkgaXM6JywgdmFsdWUpO1xuICogIH0pO1xuICpcbiAqIE5vdGUgdGhhdCB1bmxpa2UgbG9jYWxTdG9yYWdlLCBmb2NhbFN0b3JhZ2UgZG9lcyBub3QgYWxsb3cgeW91IHRvIHN0b3JlIGFuZFxuICogcmV0cmlldmUgdmFsdWVzIGJ5IHNldHRpbmcgYW5kIHF1ZXJ5aW5nIHByb3BlcnRpZXMgZGlyZWN0bHkuIFlvdSBjYW5ub3QganVzdFxuICogd3JpdGUgZm9jYWxTdG9yYWdlLmtleTsgeW91IGhhdmUgdG8gZXhwbGljaXRseSBjYWxsIHNldEl0ZW0oKSBvciBnZXRJdGVtKCkuXG4gKlxuICogcmVtb3ZlSXRlbSgpLCBjbGVhcigpLCBsZW5ndGgoKSwgYW5kIGtleSgpIGFyZSBsaWtlIHRoZSBzYW1lLW5hbWVkIG1ldGhvZHMgb2ZcbiAqIGxvY2FsU3RvcmFnZSwgYnV0LCBsaWtlIGdldEl0ZW0oKSBhbmQgc2V0SXRlbSgpIHRoZXkgdGFrZSBhIGNhbGxiYWNrXG4gKiBhcmd1bWVudC5cbiAqXG4gKiBUaGUgYXN5bmNocm9ub3VzIG5hdHVyZSBvZiBnZXRJdGVtKCkgbWFrZXMgaXQgdHJpY2t5IHRvIHJldHJpZXZlIG11bHRpcGxlXG4gKiB2YWx1ZXMuIEJ1dCB1bmxpa2UgbG9jYWxTdG9yYWdlLCBmb2NhbFN0b3JhZ2UgZG9lcyBub3QgcmVxdWlyZSB0aGUgdmFsdWVzIHlvdVxuICogc3RvcmUgdG8gYmUgc3RyaW5ncy4gU28gaWYgeW91IG5lZWQgdG8gc2F2ZSBtdWx0aXBsZSB2YWx1ZXMgYW5kIHdhbnQgdG9cbiAqIHJldHJpZXZlIHRoZW0gdG9nZXRoZXIsIGluIGEgc2luZ2xlIGFzeW5jaHJvbm91cyBvcGVyYXRpb24sIGp1c3QgZ3JvdXAgdGhlXG4gKiB2YWx1ZXMgaW50byBhIHNpbmdsZSBvYmplY3QuIFRoZSBwcm9wZXJ0aWVzIG9mIHRoaXMgb2JqZWN0IG1heSBub3QgaW5jbHVkZVxuICogRE9NIGVsZW1lbnRzLCBidXQgdGhleSBtYXkgaW5jbHVkZSB0aGluZ3MgbGlrZSBCbG9icyBhbmQgdHlwZWQgYXJyYXlzLlxuICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIGRiID0gbnVsbDtcblxuZnVuY3Rpb24gb3BlbkRhdGFiYXNlKCkge1xuICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgIGlmIChkYikge1xuICAgICAgcmVzb2x2ZShkYik7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdmFyIG9wZW5yZXEgPSBpbmRleGVkREIub3Blbihmb2NhbFN0b3JhZ2Uuc2V0dGluZ3MubmFtZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvY2FsU3RvcmFnZS5zZXR0aW5ncy52ZXJzaW9uKTtcblxuICAgIG9wZW5yZXEub25zdWNjZXNzID0gZnVuY3Rpb24gKCkge1xuICAgICAgZGIgPSBvcGVucmVxLnJlc3VsdDtcbiAgICAgIHJlc29sdmUoZGIpO1xuICAgIH07XG5cbiAgICBvcGVucmVxLm9udXBncmFkZW5lZWRlZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgIC8vIEZpcnN0IHRpbWUgc2V0dXA6IGNyZWF0ZSBhbiBlbXB0eSBvYmplY3Qgc3RvcmUuXG4gICAgICBvcGVucmVxLnJlc3VsdC5jcmVhdGVPYmplY3RTdG9yZShmb2NhbFN0b3JhZ2Uuc2V0dGluZ3Muc3RvcmVOYW1lKTtcbiAgICB9O1xuXG4gICAgb3BlbnJlcS5vbmVycm9yID0gZnVuY3Rpb24gKCkge1xuICAgICAgcmVqZWN0KG9wZW5yZXEuZXJyb3IpO1xuICAgIH07XG4gIH0pO1xufVxuXG5mdW5jdGlvbiBvcGVuU3RvcmUodHlwZSkge1xuICByZXR1cm4gb3BlbkRhdGFiYXNlKCkudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHRyYW5zYWN0aW9uID0gZGIudHJhbnNhY3Rpb24oZm9jYWxTdG9yYWdlLnNldHRpbmdzLnN0b3JlTmFtZSwgdHlwZSk7XG5cbiAgICByZXR1cm4gdHJhbnNhY3Rpb24ub2JqZWN0U3RvcmUoZm9jYWxTdG9yYWdlLnNldHRpbmdzLnN0b3JlTmFtZSk7XG4gIH0pO1xufVxuXG5mdW5jdGlvbiBvcGVuVHJhbnNhY3Rpb24odHlwZSkge1xuICByZXR1cm4gb3BlbkRhdGFiYXNlKCkudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGRiLnRyYW5zYWN0aW9uKGZvY2FsU3RvcmFnZS5zZXR0aW5ncy5zdG9yZU5hbWUsIHR5cGUpO1xuICB9KTtcbn1cblxuZnVuY3Rpb24gZ2V0SXRlbShrZXkpIHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICByZXR1cm4gb3BlblN0b3JlKCdyZWFkb25seScpLnRoZW4oZnVuY3Rpb24gKHN0b3JlKSB7XG4gICAgICB2YXIgcmVxID0gc3RvcmUuZ2V0KGtleSk7XG5cbiAgICAgIHJlcS5vbnN1Y2Nlc3MgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciB2YWx1ZSA9IHJlcS5yZXN1bHQ7XG4gICAgICAgIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgdmFsdWUgPSBudWxsO1xuICAgICAgICB9XG5cbiAgICAgICAgcmVzb2x2ZSh2YWx1ZSk7XG4gICAgICB9O1xuXG4gICAgICByZXEub25lcnJvciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmVqZWN0KHJlcS5lcnJvcik7XG4gICAgICB9O1xuICAgIH0pLmNhdGNoKHJlamVjdCk7XG4gIH0pO1xufVxuXG5mdW5jdGlvbiBzZXRJdGVtKGtleSwgdmFsdWUpIHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICByZXR1cm4gb3BlblRyYW5zYWN0aW9uKCdyZWFkd3JpdGUnKS50aGVuKGZ1bmN0aW9uICh0cmFuc2FjdGlvbikge1xuXG4gICAgICB2YXIgc3RvcmUgPSB0cmFuc2FjdGlvbi5vYmplY3RTdG9yZShmb2NhbFN0b3JhZ2Uuc2V0dGluZ3Muc3RvcmVOYW1lKTtcblxuICAgICAgLy8gQ2FzdCB0aGUga2V5IHRvIGEgc3RyaW5nLCBhcyB0aGF0J3MgYWxsIHdlIGNhbiBzZXQgYXMgYSBrZXkuXG4gICAgICBpZiAodHlwZW9mIGtleSAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgY29uc29sZS53YXJuKGtleSArICcgdXNlZCBhcyBhIGtleSwgYnV0IGl0IGlzIG5vdCBhIHN0cmluZycpO1xuICAgICAgICBrZXkgPSBTdHJpbmcoa2V5KTtcbiAgICAgIH1cblxuICAgICAgLy8gVGhlIHJlYXNvbiB3ZSBkb24ndCBfc2F2ZV8gbnVsbCBpcyBiZWNhdXNlIElFIDEwIGRvZXNcbiAgICAgIC8vIG5vdCBzdXBwb3J0IHNhdmluZyB0aGUgYG51bGxgIHR5cGUgaW4gSW5kZXhlZERCLlxuICAgICAgaWYgKHZhbHVlID09PSBudWxsKSB7XG4gICAgICAgIHZhbHVlID0gdW5kZWZpbmVkO1xuICAgICAgfVxuXG4gICAgICB2YXIgcmVxID0gc3RvcmUucHV0KHZhbHVlLCBrZXkpO1xuXG4gICAgICB0cmFuc2FjdGlvbi5vbmNvbXBsZXRlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAvLyBDYXN0IHRvIHVuZGVmaW5lZCBzbyB0aGUgdmFsdWUgcGFzc2VkIHRvXG4gICAgICAgIC8vIGNhbGxiYWNrL3Byb21pc2UgaXMgdGhlIHNhbWUgYXMgd2hhdCBvbmUgd291bGQgZ2V0IG91dFxuICAgICAgICAvLyBvZiBgZ2V0SXRlbSgpYCBsYXRlci4gVGhpcyBsZWFkcyB0byBzb21lIHdlaXJkbmVzc1xuICAgICAgICAvLyAoc2V0SXRlbSgnZm9vJywgdW5kZWZpbmVkKSB3aWxsIHJldHVybiBgbnVsbGApLCBidXRcbiAgICAgICAgLy8gaXQncyBub3QgbXkgZmF1bHQgbG9jYWxTdG9yYWdlIGlzIG91ciBiYXNlbGluZSBhbmQgdGhhdFxuICAgICAgICAvLyBpdCdzIHdlaXJkLlxuICAgICAgICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIHZhbHVlID0gbnVsbDtcbiAgICAgICAgfVxuXG4gICAgICAgIHJlc29sdmUodmFsdWUpO1xuICAgICAgfTtcblxuICAgICAgdHJhbnNhY3Rpb24ub25hYm9ydCA9IHRyYW5zYWN0aW9uLm9uZXJyb3IgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJlamVjdChyZXEuZXJyb3IgPyByZXEuZXJyb3IgOiByZXEudHJhbnNhY3Rpb24uZXJyb3IpO1xuICAgICAgfTtcbiAgICB9KS5jYXRjaChyZWplY3QpO1xuICB9KTtcbn1cblxuZnVuY3Rpb24gcmVtb3ZlSXRlbShrZXkpIHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICByZXR1cm4gb3BlblRyYW5zYWN0aW9uKCdyZWFkd3JpdGUnKS50aGVuKGZ1bmN0aW9uICh0cmFuc2FjdGlvbikge1xuICAgICAgdmFyIHN0b3JlID0gdHJhbnNhY3Rpb24ub2JqZWN0U3RvcmUoZm9jYWxTdG9yYWdlLnNldHRpbmdzLnN0b3JlTmFtZSk7XG5cbiAgICAgIC8vIENhc3QgdGhlIGtleSB0byBhIHN0cmluZywgYXMgdGhhdCdzIGFsbCB3ZSBjYW4gc2V0IGFzIGEga2V5LlxuICAgICAgaWYgKHR5cGVvZiBrZXkgIT09ICdzdHJpbmcnKSB7XG4gICAgICAgIGNvbnNvbGUud2FybihrZXkgKyAnIHVzZWQgYXMgYSBrZXksIGJ1dCBpdCBpcyBub3QgYSBzdHJpbmcnKTtcbiAgICAgICAga2V5ID0gU3RyaW5nKGtleSk7XG4gICAgICB9XG5cbiAgICAgIHZhciByZXEgPSBzdG9yZS5kZWxldGUoa2V5KTtcblxuICAgICAgdHJhbnNhY3Rpb24ub25jb21wbGV0ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmVzb2x2ZSgpO1xuICAgICAgfTtcblxuICAgICAgdHJhbnNhY3Rpb24ub25lcnJvciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmVqZWN0KHJlcS5lcnJvcik7XG4gICAgICB9O1xuXG4gICAgICAvLyBUaGUgcmVxdWVzdCB3aWxsIGFsc28gYmUgYWJvcnRlZCBpZiBzdG9yYWdlIHNwYWNlIGlzIGV4Y2VlZGVkLlxuICAgICAgdHJhbnNhY3Rpb24ub25hYm9ydCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmVqZWN0KHJlcS5lcnJvciA/IHJlcS5lcnJvciA6IHJlcS50cmFuc2FjdGlvbi5lcnJvcik7XG4gICAgICB9O1xuICAgIH0pLmNhdGNoKHJlamVjdCk7XG4gIH0pO1xufVxuXG5mdW5jdGlvbiBjbGVhcigpIHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICByZXR1cm4gb3BlblRyYW5zYWN0aW9uKCdyZWFkd3JpdGUnKS50aGVuKGZ1bmN0aW9uICh0cmFuc2FjdGlvbikge1xuICAgICAgdmFyIHN0b3JlID0gdHJhbnNhY3Rpb24ub2JqZWN0U3RvcmUoZm9jYWxTdG9yYWdlLnNldHRpbmdzLnN0b3JlTmFtZSk7XG5cbiAgICAgIHZhciByZXEgPSBzdG9yZS5jbGVhcigpO1xuXG4gICAgICB0cmFuc2FjdGlvbi5vbmNvbXBsZXRlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXNvbHZlKCk7XG4gICAgICB9O1xuXG4gICAgICB0cmFuc2FjdGlvbi5vbmFib3J0ID0gdHJhbnNhY3Rpb24ub25lcnJvciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmVqZWN0KHJlcS5lcnJvciA/IHJlcS5lcnJvciA6IHJlcS50cmFuc2FjdGlvbi5lcnJvcik7XG4gICAgICB9O1xuICAgIH0pLmNhdGNoKHJlamVjdCk7XG4gIH0pO1xufVxuXG5mdW5jdGlvbiBsZW5ndGgoY2FsbGJhY2spIHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICBvcGVuU3RvcmUoJ3JlYWRvbmx5JykudGhlbihmdW5jdGlvbiAoc3RvcmUpIHtcbiAgICAgIHZhciByZXEgPSBzdG9yZS5jb3VudCgpO1xuXG4gICAgICByZXEub25zdWNjZXNzID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXNvbHZlKHJlcS5yZXN1bHQpO1xuICAgICAgfTtcblxuICAgICAgcmVxLm9uZXJyb3IgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJlamVjdChyZXEuZXJyb3IpO1xuICAgICAgfTtcbiAgICB9KS5jYXRjaChyZWplY3QpO1xuICB9KTtcbn1cblxuZnVuY3Rpb24ga2V5KG4pIHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICBpZiAobiA8IDApIHtcbiAgICAgIHJlc29sdmUobnVsbCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgcmV0dXJuIG9wZW5TdG9yZSgncmVhZG9ubHknKS50aGVuKGZ1bmN0aW9uIChzdG9yZSkge1xuICAgICAgdmFyIGFkdmFuY2VkID0gZmFsc2U7XG4gICAgICB2YXIgcmVxID0gc3RvcmUub3BlbkN1cnNvcigpO1xuXG4gICAgICByZXEub25zdWNjZXNzID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgY3Vyc29yID0gcmVxLnJlc3VsdDtcblxuICAgICAgICBpZiAoIWN1cnNvcikge1xuICAgICAgICAgIC8vIFRoaXMgbWVhbnMgdGhlcmUgd2VyZW4ndCBlbm91Z2gga2V5cy5cbiAgICAgICAgICByZXNvbHZlKG51bGwpO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChuID09PSAwKSB7XG4gICAgICAgICAgLy8gV2UgaGF2ZSB0aGUgZmlyc3Qga2V5OyByZXR1cm4gaXQgaWYgdGhhdCdzIHdoYXQgdGhleSB3YW50ZWQuXG4gICAgICAgICAgcmVzb2x2ZShjdXJzb3Iua2V5KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBpZiAoIWFkdmFuY2VkKSB7XG4gICAgICAgICAgICAvLyBPdGhlcndpc2UsIGFzayB0aGUgY3Vyc29yIHRvIHNraXAgYWhlYWQgYG5gIHJlY29yZHMuXG4gICAgICAgICAgICBhZHZhbmNlZCA9IHRydWU7XG4gICAgICAgICAgICBjdXJzb3IuYWR2YW5jZShuKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gV2hlbiB3ZSBnZXQgaGVyZSwgd2UndmUgZ290IHRoZSBudGgga2V5LlxuICAgICAgICAgICAgcmVzb2x2ZShjdXJzb3Iua2V5KTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH07XG5cbiAgICAgIHJlcS5vbmVycm9yID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZWplY3QocmVxLmVycm9yKTtcbiAgICAgIH07XG4gICAgfSkuY2F0Y2gocmVqZWN0KTtcbiAgfSk7XG59XG5cbmZ1bmN0aW9uIGtleXMoKSB7XG4gIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgcmV0dXJuIG9wZW5TdG9yZSgncmVhZG9ubHknKS50aGVuKGZ1bmN0aW9uIChzdG9yZSkge1xuICAgICAgdmFyIHJlcSA9IHN0b3JlLm9wZW5DdXJzb3IoKTtcbiAgICAgIHZhciBrZXlzID0gW107XG5cbiAgICAgIHJlcS5vbnN1Y2Nlc3MgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBjdXJzb3IgPSByZXEucmVzdWx0O1xuXG4gICAgICAgIGlmICghY3Vyc29yKSB7XG4gICAgICAgICAgcmVzb2x2ZShrZXlzKTtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBrZXlzLnB1c2goY3Vyc29yLmtleSk7XG4gICAgICAgIGN1cnNvci5jb250aW51ZSgpO1xuICAgICAgfTtcblxuICAgICAgcmVxLm9uZXJyb3IgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJlamVjdChyZXEuZXJyb3IpO1xuICAgICAgfTtcblxuICAgIH0pLmNhdGNoKHJlamVjdCk7XG4gIH0pO1xufVxuXG4vKipcbiAqIEFzc2lnbnMgY29uZmlndXJhdGlvbnMuXG4gKiBAcGFyYW0ge09iamVjdH0gc2V0dGluZ3MgT3B0aW9ucyBvYmplY3QgdG8gdXNlIGZvciBgZm9jYWxTdG9yYWdlYCBpbnN0YW5jZS5cbiAqL1xuZnVuY3Rpb24gY29uZmlnKHNldHRpbmdzKSB7XG4gIGZvY2FsU3RvcmFnZS5zZXR0aW5ncyA9IE9iamVjdC5hc3NpZ24oe30sIERFRkFVTFRfU0VUVElOR1MsIHNldHRpbmdzIHx8IHt9KTtcbn1cblxudmFyIGZvY2FsU3RvcmFnZSA9IHtcbiAgSU5ERVhFRERCOiAwLFxuICBMT0NBTFNUT1JBR0U6IDEsXG4gIGdldEl0ZW06IGdldEl0ZW0sXG4gIHNldEl0ZW06IHNldEl0ZW0sXG4gIHJlbW92ZUl0ZW06IHJlbW92ZUl0ZW0sXG4gIGNsZWFyOiBjbGVhcixcbiAgbGVuZ3RoOiBsZW5ndGgsXG4gIGtleToga2V5LFxuICBrZXlzOiBrZXlzXG59O1xuXG52YXIgREVGQVVMVF9TRVRUSU5HUyA9IHtcbiAgZHJpdmVyOiBmb2NhbFN0b3JhZ2UuaW5kZXhlZERCLFxuICBuYW1lOiAnZm9jYWxTdG9yYWdlJyxcbiAgdmVyc2lvbjogMSxcbiAgc3RvcmVOYW1lOiAna2V5dmFsdWVwYWlycycsXG59O1xuXG5mb2NhbFN0b3JhZ2Uuc2V0dGluZ3MgPSBERUZBVUxUX1NFVFRJTkdTO1xuXG5leHBvcnQgZGVmYXVsdCBmb2NhbFN0b3JhZ2U7XG4iLCJpbXBvcnQgZm9jYWxTdG9yYWdlIGZyb20gJy4vbGliL2ZvY2FsU3RvcmFnZS5qcyc7XG5cbmV4cG9ydCBkZWZhdWx0IGZvY2FsU3RvcmFnZTtcbiJdfQ==
