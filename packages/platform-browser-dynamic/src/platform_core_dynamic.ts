/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {COMPILER_OPTIONS, CompilerFactory, PlatformRef, StaticProvider, createPlatformFactory, platformCore} from '@angular/core';
import {JitCompilerFactory} from './compiler_factory';

/**
 * A platform that included corePlatform and the compiler.
 * doc 入口第一个参数
 * @publicApi
 */
export const platformCoreDynamic = createPlatformFactory(platformCore, 'coreDynamic', [
  {provide: COMPILER_OPTIONS, useValue: {}, multi: true},
  //doing 编译工厂?
  {provide: CompilerFactory, useClass: JitCompilerFactory, deps: [COMPILER_OPTIONS]},
]);
