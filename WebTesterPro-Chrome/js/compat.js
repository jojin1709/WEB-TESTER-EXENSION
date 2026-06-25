/**
 * WebTester Pro - Cross-Browser Compatibility Layer
 * Author: Jojin John | Version: 1.0.0
 *
 * Provides unified `browserAPI` for Firefox, Chrome, Edge, Brave.
 * AMO-compliant: no eval(), no new Function(), no inline scripts.
 */

(function (global) {
  'use strict';

  var isFirefox = typeof browser !== 'undefined' && browser.runtime && browser.runtime.getURL;
  var isChrome  = typeof chrome  !== 'undefined' && chrome.runtime  && chrome.runtime.getURL;

  if (!isFirefox && !isChrome) {
    global.browserAPI = null;
    return;
  }

  // Firefox has native Promise-based API — use it directly
  if (isFirefox) {
    global.browserAPI = browser; // eslint-disable-line no-undef
    return;
  }

  // Chrome/Edge/Brave: wrap callback-based chrome.* in Promises
  var api = chrome; // eslint-disable-line no-undef

  function promisify(fn, ctx) {
    return function () {
      var args = Array.prototype.slice.call(arguments);
      return new Promise(function(resolve, reject) {
        args.push(function() {
          if (api.runtime.lastError) {
            reject(new Error(api.runtime.lastError.message));
          } else {
            var cbArgs = Array.prototype.slice.call(arguments);
            resolve(cbArgs.length === 1 ? cbArgs[0] : cbArgs);
          }
        });
        fn.apply(ctx, args);
      });
    };
  }

  // Pre-approved clipboard writer function reference (no new Function / eval)
  function _clipboardWriter(text) {
    navigator.clipboard.writeText(text).catch(function() {});
  }

  // Storage wrapper
  var storage = {
    local: {
      get:    promisify(api.storage.local.get.bind(api.storage.local)),
      set:    promisify(api.storage.local.set.bind(api.storage.local)),
      remove: promisify(api.storage.local.remove.bind(api.storage.local)),
      clear:  promisify(api.storage.local.clear.bind(api.storage.local)),
    }
  };

  // Tabs wrapper
  var tabs = {
    create:      promisify(api.tabs.create.bind(api.tabs)),
    query:       promisify(api.tabs.query.bind(api.tabs)),
    sendMessage: promisify(api.tabs.sendMessage.bind(api.tabs)),
    // AMO-safe: uses named function reference, no new Function() or eval()
    executeScript: function (tabId, details) {
      if (api.scripting && api.scripting.executeScript) {
        return api.scripting.executeScript({
          target: { tabId: tabId },
          func: _clipboardWriter,
          args: details._args || [],
        });
      }
      // Fallback: MV2 tabs.executeScript (accepts code string natively — not eval())
      return new Promise(function(resolve, reject) {
        api.tabs.executeScript(tabId, details, function(result) {
          if (api.runtime.lastError) reject(new Error(api.runtime.lastError.message));
          else resolve(result);
        });
      });
    }
  };

  // Runtime wrapper
  var runtime = {
    getURL:      api.runtime.getURL.bind(api.runtime),
    sendMessage: function () {
      var args = Array.prototype.slice.call(arguments);
      return new Promise(function(resolve, reject) {
        args.push(function(response) {
          if (api.runtime.lastError) {
            var msg = api.runtime.lastError.message || '';
            if (msg.indexOf('Could not establish connection') >= 0 ||
                msg.indexOf('No listener') >= 0) {
              resolve(undefined);
            } else {
              reject(new Error(msg));
            }
          } else {
            resolve(response);
          }
        });
        api.runtime.sendMessage.apply(api.runtime, args);
      });
    },
    onMessage:   api.runtime.onMessage,
    onInstalled: api.runtime.onInstalled,
    id:          api.runtime.id,
  };

  // Context menus wrapper
  var contextMenus = api.contextMenus ? {
    create: function (props) {
      return new Promise(function(resolve) {
        api.contextMenus.create(props, function() {
          void api.runtime.lastError;
          resolve();
        });
      });
    },
    onClicked: api.contextMenus.onClicked,
  } : null;

  // Notifications wrapper
  var notifications = api.notifications ? {
    create: promisify(api.notifications.create.bind(api.notifications)),
  } : {
    create: function() { return Promise.resolve(); },
  };

  // Action wrapper (MV3 uses `action`, MV2 uses `browserAction`)
  var action = api.action || api.browserAction || null;

  global.browserAPI = {
    storage:      storage,
    tabs:         tabs,
    runtime:      runtime,
    contextMenus: contextMenus,
    notifications: notifications,
    action:       action,
    _raw:         api,
    _isChrome:    true,
    _isFirefox:   false,
  };

}(typeof globalThis !== 'undefined' ? globalThis : this));
