/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Type, ɵstringify as stringify } from '@angular/core';

/**
 * 如果管道传入的是无效参数,抛出异常
 *
 * @author cyia
 * @date 2019-11-03
 * @export
 * @param type 管道类
 * @param value 传入值
 * @returns
 */
export function invalidPipeArgumentError(type: Type<any>, value: Object) {
  return Error(`InvalidPipeArgument: '${value}' for pipe '${stringify(type)}'`);
}
