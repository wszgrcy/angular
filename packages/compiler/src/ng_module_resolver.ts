/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { CompileReflector } from "./compile_reflector";
import { NgModule, Type, createNgModule } from "./core";
import { findLast } from "./directive_resolver";
import { stringify } from "./util";

/**
 * Resolves types to {@link NgModule}.
 */
export class NgModuleResolver {
  constructor(/**依赖注入获得*/ private _reflector: CompileReflector) {}

  isNgModule(type: any) {
    return this._reflector.annotations(type).some(createNgModule.isTypeOf);
  }
  /**
   * @returns ngModule类的装饰器传入参数(最后一个定义的,最外层)
   *  */
  resolve(
    /**有装饰器的类,ngmodule*/ type: Type,
    throwIfNotFound = true
  ): NgModule | null {

    const ngModuleMeta: NgModule = findLast(
      /**返回类的装饰器传入参数数组*/ this._reflector.annotations(type),
      /**判断传入对象中ngMetadataName是否是NgModule的函数*/ createNgModule.isTypeOf
    );

    if (ngModuleMeta) {
      return ngModuleMeta;
    } else {
      if (throwIfNotFound) {
        throw new Error(`No NgModule metadata found for '${stringify(type)}'.`);
      }
      return null;
    }
  }
}
