/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { ResourceLoader } from '@angular/compiler';
import { ɵglobal as global } from '@angular/core';

/**
 * An implementation of ResourceLoader that uses a template cache to avoid doing an actual
 * ResourceLoader.
 *
 * The template cache needs to be built and loaded into window.$templateCache
 * via a separate mechanism.
 *
 * @publicApi
 * 资源缓存的loader用于拿到某些资源的缓存(promise)
 */
export class CachedResourceLoader extends ResourceLoader {
  private _cache: { [url: string]: string };

  constructor() {
    super();
    this._cache = (<any>global).$templateCache;
    if (this._cache == null) {
      throw new Error('CachedResourceLoader: Template cache was not found in $templateCache.');
    }
  }

  get(url: string): Promise<string> {
    if (this._cache.hasOwnProperty(url)) {
      console.log('缓存', url, this._cache[url])
      return Promise.resolve(this._cache[url]);
    } else {
      return <Promise<any>>Promise.reject(
        'CachedResourceLoader: Did not find cached template for ' + url);
    }
  }
}
