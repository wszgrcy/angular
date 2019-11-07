/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { looseIdentical } from '../../util/comparison';
import { stringify } from '../../util/stringify';
import { isJsObject } from '../change_detection_util';
import { KeyValueChangeRecord, KeyValueChanges, KeyValueDiffer, KeyValueDifferFactory } from './keyvalue_differs';


export class DefaultKeyValueDifferFactory<K, V> implements KeyValueDifferFactory {
  constructor() { }
  supports(obj: any): boolean { return obj instanceof Map || isJsObject(obj); }

  create<K, V>(): KeyValueDiffer<K, V> { return new DefaultKeyValueDiffer<K, V>(); }
}

export class DefaultKeyValueDiffer<K, V> implements KeyValueDiffer<K, V>, KeyValueChanges<K, V> {
  /**记录对象中每个字段的值 */
  private _records = new Map<K, KeyValueChangeRecord_<K, V>>();
  /**第一次传入值的循环开始_insertBeforeOrAppend中赋值,赋值的是_appendAfter链表头? */
  private _mapHead: KeyValueChangeRecord_<K, V> | null = null;
  // _appendAfter is used in the check loop
  /**返回的是一个对象=>链表,仅在check及调用方法中存在,指向链表中的最后一个kv,初始化时有用,之后没用到 */
  private _appendAfter: KeyValueChangeRecord_<K, V> | null = null;
  private _previousMapHead: KeyValueChangeRecord_<K, V> | null = null;
  /**当对象中,如果有值变更,意味着变更 */
  private _changesHead: KeyValueChangeRecord_<K, V> | null = null;
  private _changesTail: KeyValueChangeRecord_<K, V> | null = null;
  /**当对象中,添加了新值,回赋值 */
  private _additionsHead: KeyValueChangeRecord_<K, V> | null = null;
  private _additionsTail: KeyValueChangeRecord_<K, V> | null = null;
  private _removalsHead: KeyValueChangeRecord_<K, V> | null = null;
  private _removalsTail: KeyValueChangeRecord_<K, V> | null = null;

  get isDirty(): boolean {
    return this._additionsHead !== null || this._changesHead !== null ||
      this._removalsHead !== null;
  }

  /**
   * 通过链表头遍历链表
   *
   * @param {(r: KeyValueChangeRecord<K, V>) => void} fn
   */
  forEachItem(fn: (r: KeyValueChangeRecord<K, V>) => void) {
    let record: KeyValueChangeRecord_<K, V> | null;
    for (record = this._mapHead; record !== null; record = record._next) {
      fn(record);
    }
  }

  forEachPreviousItem(fn: (r: KeyValueChangeRecord<K, V>) => void) {
    let record: KeyValueChangeRecord_<K, V> | null;
    for (record = this._previousMapHead; record !== null; record = record._nextPrevious) {
      fn(record);
    }
  }

  forEachChangedItem(fn: (r: KeyValueChangeRecord<K, V>) => void) {
    let record: KeyValueChangeRecord_<K, V> | null;
    for (record = this._changesHead; record !== null; record = record._nextChanged) {
      fn(record);
    }
  }

  forEachAddedItem(fn: (r: KeyValueChangeRecord<K, V>) => void) {
    let record: KeyValueChangeRecord_<K, V> | null;
    for (record = this._additionsHead; record !== null; record = record._nextAdded) {
      fn(record);
    }
  }

  forEachRemovedItem(fn: (r: KeyValueChangeRecord<K, V>) => void) {
    let record: KeyValueChangeRecord_<K, V> | null;
    for (record = this._removalsHead; record !== null; record = record._nextRemoved) {
      fn(record);
    }
  }

  diff(map?: Map<any, any> | { [k: string]: any } | null): any {
    if (!map) {
      map = new Map();
    } else if (!(map instanceof Map || isJsObject(map))) {
      throw new Error(
        `Error trying to diff '${stringify(map)}'. Only maps and objects are allowed`);
    }

    return this.check(map) ? this : null;
  }

  onDestroy() { }

  check(/**传入的值*/map: Map<any, any> | { [k: string]: any }): boolean {
    this._reset();
    /**代表下一次的位置,第一次differ为null */
    let insertBefore = this._mapHead;
    this._appendAfter = null;
    //? 如果第一个匹配成功,第二个没成功,匹配第三个时候,insertBefore应该还是第二个
    this._forEach(map, (value: any, key: any) => {
      //doc key值是否和上次的相等
      if (insertBefore && insertBefore.key === key) {
        this._maybeAddToChanges(insertBefore, value);
        this._appendAfter = insertBefore;
        insertBefore = insertBefore._next;
      } else {
        /**第一个kv的变更记录保存,在第一次differ运行或后续时obj变更 */
        const record = this._getOrCreateRecordForKey(key, value);
        insertBefore = this._insertBeforeOrAppend(insertBefore, record);
      }
    });
    // Items remaining at the end of the list have been deleted
    if (insertBefore) {
      //doc 断开insertBefore自身
      if (insertBefore._prev) {
        insertBefore._prev._next = null;
      }

      this._removalsHead = insertBefore;
      //doc 清空所有记录?
      for (let record: KeyValueChangeRecord_<K, V> | null = insertBefore; record !== null;
        record = record._nextRemoved) {
        if (record === this._mapHead) {
          this._mapHead = null;
        }
        console.log('删除记录',{ ...record }, { ...this._mapHead })
        this._records.delete(record.key);
        record._nextRemoved = record._next;
        record.previousValue = record.currentValue;
        record.currentValue = null;
        record._prev = null;
        record._next = null;
      }
    }

    // Make sure tails have no next records from previous runs
    if (this._changesTail) this._changesTail._nextChanged = null;
    if (this._additionsTail) this._additionsTail._nextAdded = null;

    return this.isDirty;
  }

  /**
   * Inserts a record before `before` or append at the end of the list when `before` is null.
   *
   * Notes:
   * - This method appends at `this._appendAfter`,
   * - This method updates `this._appendAfter`,
   * - The return value is the new value for the insertion pointer.
   */
  private _insertBeforeOrAppend(
    before: KeyValueChangeRecord_<K, V> | null,
    record: KeyValueChangeRecord_<K, V>): KeyValueChangeRecord_<K, V> | null {
    if (before) {
      //doc 把record插入到prev之后,before之前即 (before)prev->record->before
      const prev = before._prev;
      record._next = before;
      record._prev = prev;
      before._prev = record;
      if (prev) {
        prev._next = record;
      }
      //doc 如果是第一个并且没匹配上,那么重置为第一个记录
      if (before === this._mapHead) {
        this._mapHead = record;
      }

      this._appendAfter = before;
      return before;
    }
    //↓这部分只有初始化才执行
    if (this._appendAfter) {
      this._appendAfter._next = record;
      record._prev = this._appendAfter;
    } else {
      this._mapHead = record;
    }
    //doc 应该永远都是最后一个
    this._appendAfter = record;
    //doc 第一次的时候,循环返回永远是null
    return null;
  }

  /**
   * 返回或者创建一个新的记录
   * 新增一个记录时,会把他加入到新增链表中
   * @author cyia
   * @date 2019-11-05
   * @private
   * @param key
   * @param value
   * @returns
   */
  private _getOrCreateRecordForKey(key: K, value: V): KeyValueChangeRecord_<K, V> {
    //doc 如果有记录(key在上一次存在),才会走这里
    if (this._records.has(key)) {
      /**当前key的记录类 */
      const record = this._records.get(key)!;
      this._maybeAddToChanges(record, value);
      const prev = record._prev;
      const next = record._next;
      //? 把record从链表中拿出来?
      if (prev) {
        prev._next = next;
      }
      if (next) {
        next._prev = prev;
      }
      record._next = null;
      record._prev = null;

      return record;
    }

    const record = new KeyValueChangeRecord_<K, V>(key);
    this._records.set(key, record);
    record.currentValue = value;
    this._addToAdditions(record);
    return record;
  }

  /** @internal */
  _reset() {
    if (this.isDirty) {
      let record: KeyValueChangeRecord_<K, V> | null;
      // let `_previousMapHead` contain the state of the map before the changes
      //doc 貌似differ中无用
      this._previousMapHead = this._mapHead;
      for (record = this._previousMapHead; record !== null; record = record._next) {
        record._nextPrevious = record._next;
      }

      // Update `record.previousValue` with the value of the item before the changes
      // We need to update all changed items (that's those which have been added and changed)
      //doc 用于接下来的对比,把上一次的值放到pre中
      for (record = this._changesHead; record !== null; record = record._nextChanged) {
        record.previousValue = record.currentValue;
      }
      //?当前值变成前一个值?用途?
      for (record = this._additionsHead; record != null; record = record._nextAdded) {
        record.previousValue = record.currentValue;
      }
      //doc 清除上一次的记录,此时dirty应该是false
      this._changesHead = this._changesTail = null;
      this._additionsHead = this._additionsTail = null;
      this._removalsHead = null;
    }
  }

  // Add the record or a given key to the list of changes only when the value has actually changed
  /**
   * 判断是否可能发生了变化
   *
   * @author cyia
   * @date 2019-11-06
   * @private
   * @param record
   * @param newValue
   */
  private _maybeAddToChanges(record: KeyValueChangeRecord_<K, V>, newValue: any): void {
    if (!looseIdentical(newValue, record.currentValue)) {
      record.previousValue = record.currentValue;
      record.currentValue = newValue;
      this._addToChanges(record);
    }
  }

  /**
   * 新增链表,每当加入了不同的key,都会把这个当作新增的加入
   * 
   * @author cyia
   * @date 2019-11-05
   * @private
   * @param record
   */
  private _addToAdditions(record: KeyValueChangeRecord_<K, V>) {
    if (this._additionsHead === null) {
      this._additionsHead = this._additionsTail = record;
    } else {
      this._additionsTail!._nextAdded = record;
      this._additionsTail = record;
    }
  }

  /**
   * 变更链表,每当key对应的value变化,都会加入到变更链表
   *
   * @author cyia
   * @date 2019-11-06
   * @private
   * @param record
   */
  private _addToChanges(record: KeyValueChangeRecord_<K, V>) {
    if (this._changesHead === null) {
      this._changesHead = this._changesTail = record;
    } else {
      this._changesTail!._nextChanged = record;
      this._changesTail = record;
    }
  }

  /** @internal */
  private _forEach<K, V>(obj: Map<K, V> | { [k: string]: V }, fn: (v: V, k: any) => void) {
    if (obj instanceof Map) {
      obj.forEach(fn);
    } else {
      Object.keys(obj).forEach(k => fn(obj[k], k));
    }
  }
}

class KeyValueChangeRecord_<K, V> implements KeyValueChangeRecord<K, V> {
  previousValue: V | null = null;
  currentValue: V | null = null;

  /** @internal */
  _nextPrevious: KeyValueChangeRecord_<K, V> | null = null;
  /** @internal */
  _next: KeyValueChangeRecord_<K, V> | null = null;
  /** @internal */
  _prev: KeyValueChangeRecord_<K, V> | null = null;
  /** @internal */
  _nextAdded: KeyValueChangeRecord_<K, V> | null = null;
  /** @internal */
  _nextRemoved: KeyValueChangeRecord_<K, V> | null = null;
  /** @internal */
  _nextChanged: KeyValueChangeRecord_<K, V> | null = null;

  constructor(public key: K) { }
}
