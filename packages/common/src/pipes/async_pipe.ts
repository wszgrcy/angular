/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { ChangeDetectorRef, EventEmitter, Injectable, OnDestroy, Pipe, PipeTransform, WrappedValue, ɵisObservable, ɵisPromise, ɵlooseIdentical } from '@angular/core';
import { Observable, SubscriptionLike } from 'rxjs';
import { invalidPipeArgumentError } from './invalid_pipe_argument_error';

interface SubscriptionStrategy {
  createSubscription(async: Observable<any> | Promise<any>, updateLatestValue: any): SubscriptionLike
    | Promise<any>;
  dispose(subscription: SubscriptionLike | Promise<any>): void;
  onDestroy(subscription: SubscriptionLike | Promise<any>): void;
}

class ObservableStrategy implements SubscriptionStrategy {
  createSubscription(async: Observable<any>, updateLatestValue: any): SubscriptionLike {
    return async.subscribe({ next: updateLatestValue, error: (e: any) => { throw e; } });
  }

  dispose(subscription: SubscriptionLike): void { subscription.unsubscribe(); }

  onDestroy(subscription: SubscriptionLike): void { subscription.unsubscribe(); }
}

class PromiseStrategy implements SubscriptionStrategy {
  createSubscription(async: Promise<any>, updateLatestValue: (v: any) => any): Promise<any> {
    return async.then(updateLatestValue, e => { throw e; });
  }

  dispose(subscription: Promise<any>): void { }

  onDestroy(subscription: Promise<any>): void { }
}
/**如果是Promise,采用策略 */
const _promiseStrategy = new PromiseStrategy();
/**如果是Observable,采用策略 */
const _observableStrategy = new ObservableStrategy();

/**
 * @ngModule CommonModule
 * @description
 *
 * Unwraps a value from an asynchronous primitive.
 *
 * The `async` pipe subscribes to an `Observable` or `Promise` and returns the latest value it has
 * emitted. When a new value is emitted, the `async` pipe marks the component to be checked for
 * changes. When the component gets destroyed, the `async` pipe unsubscribes automatically to avoid
 * potential memory leaks.
 *
 * @usageNotes
 *
 * ### Examples
 *
 * This example binds a `Promise` to the view. Clicking the `Resolve` button resolves the
 * promise.
 *
 * {@example common/pipes/ts/async_pipe.ts region='AsyncPipePromise'}
 *
 * It's also possible to use `async` with Observables. The example below binds the `time` Observable
 * to the view. The Observable continuously updates the view with the current time.
 *
 * {@example common/pipes/ts/async_pipe.ts region='AsyncPipeObservable'}
 *
 * @publicApi
 */
@Injectable()
@Pipe({ name: 'async', pure: false })
export class AsyncPipe implements OnDestroy, PipeTransform {
  private _latestValue: any = null;
  private _latestReturnedValue: any = null;
  /**策略的定义 */
  private _subscription: SubscriptionLike | Promise<any> | null = null;
  /**保存的传入值,每次更改值后重置 */
  private _obj: Observable<any> | Promise<any> | EventEmitter<any> | null = null;
  private _strategy: SubscriptionStrategy = null!;

  constructor(private _ref: ChangeDetectorRef) { }


  /**
   * 存在订阅时,生命周期结束修改
   *
   * @author cyia
   * @date 2019-11-03
   */
  ngOnDestroy(): void {
    if (this._subscription) {
      this._dispose();
    }
  }

  transform<T>(obj: null): null;
  transform<T>(obj: undefined): undefined;
  transform<T>(obj: Observable<T> | null | undefined): T | null;
  transform<T>(obj: Promise<T> | null | undefined): T | null;
  transform(obj: Observable<any> | Promise<any> | null | undefined): any {
    if (!this._obj) {
      if (obj) {
        this._subscribe(obj);
      }
      this._latestReturnedValue = this._latestValue;
      return this._latestValue;
    }
    //doc 当变更后清除掉上一次的值,然后重新运行
    if (obj !== this._obj) {
      this._dispose();
      return this.transform(obj as any);
    }
    //doc 判断值是否相等(排除nan==nan)
    if (ɵlooseIdentical(this._latestValue, this._latestReturnedValue)) {
      return this._latestReturnedValue;
    }

    this._latestReturnedValue = this._latestValue;
    //todo 为什么要创建一个包裹类包裹?
    return WrappedValue.wrap(this._latestValue);
  }

  /**
   * 初始化,订阅传入值
   *
   * @author cyia
   * @date 2019-11-03
   * @private
   * @param obj
   */
  private _subscribe(obj: Observable<any> | Promise<any> | EventEmitter<any>): void {
    this._obj = obj;
    this._strategy = this._selectStrategy(obj);
    //doc 当值变更时,调用_updateLatestValue,回调值传入其中
    this._subscription = this._strategy.createSubscription(
      obj, (value: Object) => this._updateLatestValue(obj, value));
  }
  private _selectStrategy(obj: Observable<any> | Promise<any> | EventEmitter<any>): any {
    if (ɵisPromise(obj)) {
      return _promiseStrategy;
    }

    if (ɵisObservable(obj)) {
      return _observableStrategy;
    }

    throw invalidPipeArgumentError(AsyncPipe, obj);
  }

  private _dispose(): void {
    this._strategy.dispose(this._subscription!);
    this._latestValue = null;
    this._latestReturnedValue = null;
    this._subscription = null;
    this._obj = null;
  }

  private _updateLatestValue(async: any, value: Object): void {
    //doc 变更对象的确是自身时触发,不清楚为什么要这么搞,是因为变更对象有可能变化?
    if (async === this._obj) {
      this._latestValue = value;
      this._ref.markForCheck();
    }
  }
}
