/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Observable } from 'rxjs';

/**
 * 判断传入的参数是否是一个类似promise结构的
 * 不一定非要是Promise类,自定义的符合promise结构的也可以
 */
export function isPromise(obj: any): obj is Promise<any> {
  // allow any Promise/A+ compliant thenable.
  // It's up to the caller to ensure that obj.then conforms to the spec
  return !!obj && typeof obj.then === 'function';
}

/**
 * 判断传入的参数是不是一个 Observable
 */
export function isObservable(obj: any | Observable<any>): obj is Observable<any> {
  // 下面的链接说rxjs有个自己检测是不是Observable的新方法
  // TODO: use isObservable once we update pass rxjs 6.1
  // https://github.com/ReactiveX/rxjs/blob/master/CHANGELOG.md#610-2018-05-03
  return !!obj && typeof obj.subscribe === 'function';
}
