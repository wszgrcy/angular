/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Type, isType } from "../interface/type";
import { ANNOTATIONS, PARAMETERS, PROP_METADATA } from "../util/decorators";
import { global } from "../util/global";
import { stringify } from "../util/stringify";

import { PlatformReflectionCapabilities } from "./platform_reflection_capabilities";
import { GetterFn, MethodFn, SetterFn } from "./types";

/**
 * Attention: These regex has to hold even if the code is minified!
 * 匹配格式 
 * 
 * function abc(){
    .apply(this,arguments)
}
 */
export const DELEGATE_CTOR = /^function\s+\S+\(\)\s*{[\s\S]+\.apply\(this,\s*arguments\)/;
/**匹配格式 class abc extends bcd{} */
export const INHERITED_CLASS = /^class\s+[A-Za-z\d$_]*\s*extends\s+[^{]+{/;
/**匹配格式class abc extends bcd{
constructor()
} */
export const INHERITED_CLASS_WITH_CTOR = /^class\s+[A-Za-z\d$_]*\s*extends\s+[^{]+{[\s\S]*constructor\s*\(/;
/**匹配格式class abc extends bcd{
constructor(){ super(...arguments)}
} */
export const INHERITED_CLASS_WITH_DELEGATE_CTOR = /^class\s+[A-Za-z\d$_]*\s*extends\s+[^{]+{[\s\S]*constructor\s*\(\)\s*{\s+super\(\.\.\.arguments\)/;

/**
 * Determine whether a stringified type is a class which delegates its constructor
 * to its parent.
 *
 * This is not trivial since compiled code can actually contain a constructor function
 * even if the original source code did not. For instance, when the child class contains
 * an initialized instance property.
 * 用正则匹配函数和类(传入的为字符串)
 * 匹配带继承的类(函数,类)
 */
export function isDelegateCtor(/**类型字符串化*/ typeStr: string): boolean {
  return (
    DELEGATE_CTOR.test(typeStr) ||
    INHERITED_CLASS_WITH_DELEGATE_CTOR.test(typeStr) ||
    (INHERITED_CLASS.test(typeStr) && !INHERITED_CLASS_WITH_CTOR.test(typeStr))
  );
}

export class ReflectionCapabilities implements PlatformReflectionCapabilities {
  /**实际上是装饰器的元数据反射器 reflect-metadata */
  private _reflect: any;

  constructor(reflect?: any) {
    this._reflect = reflect || global["Reflect"];
  }

  isReflectionEnabled(): boolean {
    return true;
  }
  /**将参数类型初始化 */
  factory<T>(t: Type<T>): (args: any[]) => T {
    return (...args: any[]) => new t(...args);
  }

  /** @internal */
  _zipTypesAndAnnotations(
    paramTypes: any[],
    /**ParamDecoratorFactory数组 */ paramAnnotations: any[]
  ): any[][] {
    // console.log('_zipTypesAndAnnotations', paramTypes, paramAnnotations)
    let result: any[][];

    if (typeof paramTypes === "undefined") {
      result = new Array(paramAnnotations.length);
    } else {
      result = new Array(paramTypes.length);
    }

    for (let i = 0; i < result.length; i++) {
      // TS outputs Object for parameters without types, while Traceur omits
      // the annotations. For now we preserve the Traceur behavior to aid
      // migration, but this can be revisited.
      if (typeof paramTypes === "undefined") {
        result[i] = [];
      } else if (paramTypes[i] && paramTypes[i] != Object) {
        result[i] = [paramTypes[i]];
      } else {
        result[i] = [];
      }
      if (paramAnnotations && paramAnnotations[i] != null) {
        result[i] = result[i].concat(paramAnnotations[i]);
      }
    }
    return result;
  }

  private _ownParameters(type: Type<any>, parentCtor: any): any[][] | null {
    /**类/函数,装饰器装饰的类转化为字符串 */
    const typeStr = type.toString();
    // If we have no decorators, we only have function.length as metadata.
    // In that case, to detect whether a child class declared an own constructor or not,
    // we need to look inside of that constructor to check whether it is
    // just calling the parent.
    // This also helps to work around for https://github.com/Microsoft/TypeScript/issues/12439
    // that sets 'design:paramtypes' to []
    // if a class inherits from another class but has no ctor declared itself.
    //todo 不清楚操作原因

    //doc 如果类被继承,返回null
    if (isDelegateCtor(typeStr)) {
      return null;
    }
    //todo parameters赋值位置
    // Prefer the direct API.
    if (
      (<any>type).parameters &&
      (<any>type).parameters !== parentCtor.parameters
    ) {
      return (<any>type).parameters;
    }

    // API of tsickle for lowering decorators to properties on the class.
    const tsickleCtorParams = (<any>type).ctorParameters;
    if (tsickleCtorParams && tsickleCtorParams !== parentCtor.ctorParameters) {
      // Newer tsickle uses a function closure
      // Retain the non-function case for compatibility with older tsickle
      const ctorParameters =
        typeof tsickleCtorParams === "function"
          ? tsickleCtorParams()
          : tsickleCtorParams;
      const paramTypes = ctorParameters.map(
        (ctorParam: any) => ctorParam && ctorParam.type
      );
      const paramAnnotations = ctorParameters.map(
        (ctorParam: any) =>
          ctorParam && convertTsickleDecoratorIntoMetadata(ctorParam.decorators)
      );
      return this._zipTypesAndAnnotations(paramTypes, paramAnnotations);
    }

    // API for metadata created by invoking the decorators.
    const paramAnnotations =
      type.hasOwnProperty(PARAMETERS) && (type as any)[PARAMETERS];
    const paramTypes =
      this._reflect &&
      this._reflect.getOwnMetadata &&
      this._reflect.getOwnMetadata("design:paramtypes", type);
    if (paramTypes || paramAnnotations) {
      return this._zipTypesAndAnnotations(paramTypes, paramAnnotations);
    }

    // If a class has no decorators, at least create metadata
    // based on function.length.
    // Note: We know that this is a real constructor as we checked
    // the content of the constructor above.
    return new Array(<any>type.length).fill(undefined);
  }

  parameters(type: Type<any>): any[][] {
    // Note: only report metadata if we have at least one class decorator
    // to stay in sync with the static reflector.
    if (!isType(type)) {
      return [];
    }
    const parentCtor = getParentCtor(type);
    let parameters = this._ownParameters(type, parentCtor);
    if (!parameters && parentCtor !== Object) {
      parameters = this.parameters(parentCtor);
    }
    return parameters || [];
  }
  /**类装饰器返回其输入参数 */
  private _ownAnnotations(
    typeOrFunc: Type<any>,
    parentCtor: any
  ): any[] | null {
    // Prefer the direct API.
    //doc ngmodule没有这两项
    if (
      (<any>typeOrFunc).annotations &&
      (<any>typeOrFunc).annotations !== parentCtor.annotations
    ) {
      let annotations = (<any>typeOrFunc).annotations;
      if (typeof annotations === "function" && annotations.annotations) {
        annotations = annotations.annotations;
      }
      return annotations;
    }
    //?理论上也没有
    // API of tsickle for lowering decorators to properties on the class.
    if (
      (<any>typeOrFunc).decorators &&
      (<any>typeOrFunc).decorators !== parentCtor.decorators
    ) {
      return convertTsickleDecoratorIntoMetadata((<any>typeOrFunc).decorators);
    }
    //doc 这个是类装饰器的参数返回
    // API for metadata created by invoking the decorators.
    if (typeOrFunc.hasOwnProperty(ANNOTATIONS)) {
      return (typeOrFunc as any)[ANNOTATIONS];
    }
    return null;
  }
  /**
   * @returns 类的话,返回装饰器的参数列表(包含父类)
   * doc 当传入类时,返回他的外界装饰器参数
   */
  annotations(typeOrFunc: Type<any>): any[] {
    if (!isType(typeOrFunc)) {
      return [];
    }
    /**类的父级构造函数 */
    const parentCtor = getParentCtor(typeOrFunc);
    const ownAnnotations = this._ownAnnotations(typeOrFunc, parentCtor) || [];
    //todo 待测试父类装饰器
    const parentAnnotations =
      parentCtor !== Object ? this.annotations(parentCtor) : [];
    //doc 返回的是父类的装饰器加上当前的
    return parentAnnotations.concat(ownAnnotations);
  }

  private _ownPropMetadata(
    typeOrFunc: any,
    parentCtor: any
  ): { [key: string]: any[] } | null {
    // Prefer the direct API.
    if (
      (<any>typeOrFunc).propMetadata &&
      (<any>typeOrFunc).propMetadata !== parentCtor.propMetadata
    ) {
      let propMetadata = (<any>typeOrFunc).propMetadata;
      if (typeof propMetadata === "function" && propMetadata.propMetadata) {
        propMetadata = propMetadata.propMetadata;
      }
      return propMetadata;
    }

    // API of tsickle for lowering decorators to properties on the class.
    if (
      (<any>typeOrFunc).propDecorators &&
      (<any>typeOrFunc).propDecorators !== parentCtor.propDecorators
    ) {
      const propDecorators = (<any>typeOrFunc).propDecorators;
      const propMetadata = <{ [key: string]: any[] }>{};
      Object.keys(propDecorators).forEach(prop => {
        propMetadata[prop] = convertTsickleDecoratorIntoMetadata(
          propDecorators[prop]
        );
      });
      return propMetadata;
    }

    // API for metadata created by invoking the decorators.
    if (typeOrFunc.hasOwnProperty(PROP_METADATA)) {
      return (typeOrFunc as any)[PROP_METADATA];
    }
    return null;
  }

  propMetadata(typeOrFunc: any): { [key: string]: any[] } {
    if (!isType(typeOrFunc)) {
      return {};
    }
    const parentCtor = getParentCtor(typeOrFunc);
    const propMetadata: { [key: string]: any[] } = {};
    if (parentCtor !== Object) {
      const parentPropMetadata = this.propMetadata(parentCtor);
      Object.keys(parentPropMetadata).forEach(propName => {
        propMetadata[propName] = parentPropMetadata[propName];
      });
    }
    const ownPropMetadata = this._ownPropMetadata(typeOrFunc, parentCtor);
    if (ownPropMetadata) {
      Object.keys(ownPropMetadata).forEach(propName => {
        const decorators: any[] = [];
        if (propMetadata.hasOwnProperty(propName)) {
          decorators.push(...propMetadata[propName]);
        }
        decorators.push(...ownPropMetadata[propName]);
        propMetadata[propName] = decorators;
      });
    }
    return propMetadata;
  }

  ownPropMetadata(typeOrFunc: any): { [key: string]: any[] } {
    if (!isType(typeOrFunc)) {
      return {};
    }
    return this._ownPropMetadata(typeOrFunc, getParentCtor(typeOrFunc)) || {};
  }

  hasLifecycleHook(type: any, lcProperty: string): boolean {
    return type instanceof Type && lcProperty in type.prototype;
  }

  guards(type: any): { [key: string]: any } {
    return {};
  }

  getter(name: string): GetterFn {
    return <GetterFn>new Function("o", "return o." + name + ";");
  }

  setter(name: string): SetterFn {
    return <SetterFn>new Function("o", "v", "return o." + name + " = v;");
  }

  method(name: string): MethodFn {
    const functionBody = `if (!o.${name}) throw new Error('"${name}" is undefined');
        return o.${name}.apply(o, args);`;
    return <MethodFn>new Function("o", "args", functionBody);
  }

  // There is not a concept of import uri in Js, but this is useful in developing Dart applications.
  importUri(type: any): string {
    // StaticSymbol
    if (typeof type === "object" && type["filePath"]) {
      return type["filePath"];
    }
    // Runtime type
    return `./${stringify(type)}`;
  }

  resourceUri(type: any): string {
    return `./${stringify(type)}`;
  }

  resolveIdentifier(
    name: string,
    moduleUrl: string,
    members: string[],
    runtime: any
  ): any {
    return runtime;
  }
  resolveEnum(enumIdentifier: any, name: string): any {
    return enumIdentifier[name];
  }
}
/**装饰器实例化? */
function convertTsickleDecoratorIntoMetadata(
  decoratorInvocations: any[]
): any[] {
  if (!decoratorInvocations) {
    return [];
  }
  return decoratorInvocations.map(decoratorInvocation => {
    /**装饰器类型? */
    const decoratorType = decoratorInvocation.type;
    /**应该和上面的一样? */
    const annotationCls = decoratorType.annotationCls;
    /**装饰器的参数? */
    const annotationArgs = decoratorInvocation.args
      ? decoratorInvocation.args
      : [];
    //doc 这一步是将工厂函数调用
    return new annotationCls(...annotationArgs);
  });
}
/**查找类/函数的继承一级extends */
function getParentCtor(ctor: Function): Type<any> {
  const parentProto = ctor.prototype
    ? Object.getPrototypeOf(ctor.prototype)
    : null;
  const parentCtor = parentProto ? parentProto.constructor : null;
  // Note: We always use `Object` as the null value
  // to simplify checking later on.
  return parentCtor || Object;
}
