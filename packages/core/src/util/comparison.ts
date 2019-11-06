/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {areIterablesEqual, isListLikeIterable} from './iterable';



/**
 * 正常人逻辑上认为的相等
 * JS has NaN !== NaN
 * @author cyia
 * @date 2019-11-05
 * @export
 * @param a
 * @param b
 * @returns
 */
export function looseIdentical(a: any, b: any): boolean {
  return a === b || typeof a === 'number' && typeof b === 'number' && isNaN(a) && isNaN(b);
}

export function devModeEqual(a: any, b: any): boolean {
  const isListLikeIterableA = isListLikeIterable(a);
  const isListLikeIterableB = isListLikeIterable(b);
  if (isListLikeIterableA && isListLikeIterableB) {
    return areIterablesEqual(a, b, devModeEqual);
  } else {
    const isAObject = a && (typeof a === 'object' || typeof a === 'function');
    const isBObject = b && (typeof b === 'object' || typeof b === 'function');
    if (!isListLikeIterableA && isAObject && !isListLikeIterableB && isBObject) {
      return true;
    } else {
      return looseIdentical(a, b);
    }
  }
}
