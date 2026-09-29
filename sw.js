/**
 * Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// If the loader is already loaded, just stop.
if (!self.define) {
  let registry = {};

  // Used for `eval` and `importScripts` where we can't get script URL by other means.
  // In both cases, it's safe to use a global var because those functions are synchronous.
  let nextDefineUri;

  const singleRequire = (uri, parentUri) => {
    uri = new URL(uri + ".js", parentUri).href;
    return registry[uri] || (
      
        new Promise(resolve => {
          if ("document" in self) {
            const script = document.createElement("script");
            script.src = uri;
            script.onload = resolve;
            document.head.appendChild(script);
          } else {
            nextDefineUri = uri;
            importScripts(uri);
            resolve();
          }
        })
      
      .then(() => {
        let promise = registry[uri];
        if (!promise) {
          throw new Error(`Module ${uri} didn’t register its module`);
        }
        return promise;
      })
    );
  };

  self.define = (depsNames, factory) => {
    const uri = nextDefineUri || ("document" in self ? document.currentScript.src : "") || location.href;
    if (registry[uri]) {
      // Module is already loading or loaded.
      return;
    }
    let exports = {};
    const require = depUri => singleRequire(depUri, uri);
    const specialDeps = {
      module: { uri },
      exports,
      require
    };
    registry[uri] = Promise.all(depsNames.map(
      depName => specialDeps[depName] || require(depName)
    )).then(deps => {
      factory(...deps);
      return exports;
    });
  };
}
define(['./workbox-afac4cd2'], (function (workbox) { 'use strict';

  self.skipWaiting();
  workbox.clientsClaim();
  /**
   * The precacheAndRoute() method efficiently caches and responds to
   * requests for URLs in the manifest.
   * See https://goo.gl/S9QRab
   */
  workbox.precacheAndRoute([{
    "url": "pwa-maskable-512x512.png",
    "revision": "14f5506264b2cab88f7b6175d88f544a"
  }, {
    "url": "pwa-512x512.png",
    "revision": "e0ab6283ccc2ee9edbcebbc085e3ab01"
  }, {
    "url": "pwa-192x192.png",
    "revision": "9862b344dff84a7bcdfa5688ae93226a"
  }, {
    "url": "index.html",
    "revision": "e567b7752947076a7df0bcfea8632bc1"
  }, {
    "url": "icon.svg",
    "revision": "640a3e60ff4ebb85968e33b7cc594fce"
  }, {
    "url": "favicon.ico",
    "revision": "f802d3d606631b403f68013c2131ecc0"
  }, {
    "url": "apple-touch-icon.png",
    "revision": "da82ba2cb3f8ae58320e0b8b80786aa6"
  }, {
    "url": "assets/workbox-window.prod.es5-Bd17z0YL.js",
    "revision": null
  }, {
    "url": "assets/index-DR0qzLo7.js",
    "revision": null
  }, {
    "url": "assets/index-BkBMFe87.css",
    "revision": null
  }, {
    "url": "apple-touch-icon.png",
    "revision": "da82ba2cb3f8ae58320e0b8b80786aa6"
  }, {
    "url": "favicon.ico",
    "revision": "f802d3d606631b403f68013c2131ecc0"
  }, {
    "url": "icon.svg",
    "revision": "640a3e60ff4ebb85968e33b7cc594fce"
  }, {
    "url": "pwa-192x192.png",
    "revision": "9862b344dff84a7bcdfa5688ae93226a"
  }, {
    "url": "pwa-512x512.png",
    "revision": "e0ab6283ccc2ee9edbcebbc085e3ab01"
  }, {
    "url": "pwa-maskable-512x512.png",
    "revision": "14f5506264b2cab88f7b6175d88f544a"
  }, {
    "url": "manifest.webmanifest",
    "revision": "4341c7f33c305e34a36e090c1feb2133"
  }], {});
  workbox.cleanupOutdatedCaches();
  workbox.registerRoute(new workbox.NavigationRoute(workbox.createHandlerBoundToURL("index.html")));
  workbox.registerRoute(/^https:\/\/fonts\.googleapis\.com\/.*/i, new workbox.CacheFirst({
    "cacheName": "google-fonts-cache",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 10,
      maxAgeSeconds: 31536000
    }), new workbox.CacheableResponsePlugin({
      statuses: [0, 200]
    })]
  }), 'GET');
  workbox.registerRoute(/^https:\/\/fonts\.gstatic\.com\/.*/i, new workbox.CacheFirst({
    "cacheName": "gstatic-fonts-cache",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 10,
      maxAgeSeconds: 31536000
    }), new workbox.CacheableResponsePlugin({
      statuses: [0, 200]
    })]
  }), 'GET');

}));
