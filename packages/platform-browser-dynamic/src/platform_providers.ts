/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {ɵPLATFORM_BROWSER_ID as PLATFORM_BROWSER_ID} from '@angular/common';
import {ResourceLoader} from '@angular/compiler';
import {COMPILER_OPTIONS, PLATFORM_ID, StaticProvider} from '@angular/core';

import {ɵINTERNAL_BROWSER_PLATFORM_PROVIDERS as INTERNAL_BROWSER_PLATFORM_PROVIDERS} from '@angular/platform-browser';

import {ResourceLoaderImpl} from './resource_loader/resource_loader_impl';

/**
 * @publicApi
 */
export const INTERNAL_BROWSER_DYNAMIC_PLATFORM_PROVIDERS: StaticProvider[] = [
  //doc 平台id,dom适配,单元测试用的,平台跳转,document
  INTERNAL_BROWSER_PLATFORM_PROVIDERS,
  {
    provide: COMPILER_OPTIONS,
    useValue: {providers: [{provide: /**一个封装请求资源的方法*/ResourceLoader, useClass: ResourceLoaderImpl, deps: []}]},
    multi: true
  },
  //doc 平台id
  {provide: PLATFORM_ID, useValue: PLATFORM_BROWSER_ID},
];
