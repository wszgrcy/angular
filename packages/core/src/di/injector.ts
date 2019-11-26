/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Type } from '../interface/type';
import { stringify } from '../util/stringify';

import { resolveForwardRef } from './forward_ref';
import { InjectionToken } from './injection_token';
import { INJECTOR, NG_TEMP_TOKEN_PATH, NullInjector, THROW_IF_NOT_FOUND, USE_VALUE, catchInjectorError, formatError, ɵɵinject } from './injector_compatibility';
import { ɵɵdefineInjectable } from './interface/defs';
import { InjectFlags } from './interface/injector';
import { ConstructorProvider, ExistingProvider, FactoryProvider, StaticClassProvider, StaticProvider, ValueProvider } from './interface/provider';
import { Inject, Optional, Self, SkipSelf } from './metadata';
import { createInjector } from './r3_injector';

export function INJECTOR_IMPL__PRE_R3__(
  providers: StaticProvider[], parent: Injector | undefined, name: string) {
  return new StaticInjector(providers, parent, name);
}

export function INJECTOR_IMPL__POST_R3__(
  providers: StaticProvider[], parent: Injector | undefined, name: string) {
  return createInjector({ name: name }, parent, providers, name);
}

export const INJECTOR_IMPL = INJECTOR_IMPL__PRE_R3__;

/**
 * Concrete injectors implement this interface.
 *
 * For more details, see the ["Dependency Injection Guide"](guide/dependency-injection).
 *
 * @usageNotes
 * ### Example
 *
 * {@example core/di/ts/injector_spec.ts region='Injector'}
 *
 * `Injector` returns itself when given `Injector` as a token:
 *
 * {@example core/di/ts/injector_spec.ts region='injectInjector'}
 *
 * @publicApi
 * 用于手动获得和添加provider方法的.
 */
export abstract class Injector {
  static THROW_IF_NOT_FOUND = THROW_IF_NOT_FOUND;
  static NULL: Injector = new NullInjector();

  /**
   * Retrieves an instance from the injector based on the provided token.
   * @returns The instance from the injector if defined, otherwise the `notFoundValue`.
   * @throws When the `notFoundValue` is `undefined` or `Injector.THROW_IF_NOT_FOUND`.
   */
  abstract get<T>(token: Type<T> | InjectionToken<T>, notFoundValue?: T, flags?: InjectFlags): T;
  /**
   * @deprecated from v4.0.0 use Type<T> or InjectionToken<T>
   * @suppress {duplicate}
   */
  abstract get(token: any, notFoundValue?: any): any;

  /**
   * @deprecated from v5 use the new signature Injector.create(options)
   */
  static create(providers: StaticProvider[], parent?: Injector): Injector;

  static create(options: { providers: StaticProvider[], parent?: Injector, name?: string }): Injector;

  /**
   * Create a new Injector which is configure using `StaticProvider`s.
   *
   * @usageNotes
   * ### Example
   *
   * {@example core/di/ts/provider_spec.ts region='ConstructorProvider'}
   */
  static create(
    options: StaticProvider[] | { providers: StaticProvider[], parent?: Injector, name?: string },
    parent?: Injector): Injector {
    if (Array.isArray(options)) {
      return INJECTOR_IMPL(options, parent, '');
    } else {
      return INJECTOR_IMPL(options.providers, options.parent, options.name || '');
    }
  }

  /** @nocollapse */
  static ngInjectableDef = ɵɵdefineInjectable({
    token: Injector,
    providedIn: 'any' as any,
    factory: () => ɵɵinject(INJECTOR),
  });

  /**
   * @internal
   * @nocollapse
   */
  static __NG_ELEMENT_ID__ = -1;
}



const IDENT = function <T>(value: T): T {
  return value;
};
const EMPTY = <any[]>[];
const CIRCULAR = IDENT;
/**传入的参数转换为数组 */
const MULTI_PROVIDER_FN = function (): any[] {
  return Array.prototype.slice.call(arguments);

};
/**选项标志 */
const enum OptionFlags {
  Optional = 1 << 0,
  CheckSelf = 1 << 1,
  CheckParent = 1 << 2,
  Default = CheckSelf | CheckParent
}
const NO_NEW_LINE = 'ɵ';

export class StaticInjector implements Injector {
  readonly parent: Injector;
  readonly source: string | null;

  private _records: Map<any, Record>;

  constructor(
    providers: StaticProvider[], parent: Injector = Injector.NULL,/**外界赋值是name */ source: string | null = null) {
    this.parent = parent;
    this.source = source;
    const records = this._records = new Map<any, Record>();
    records.set(
      Injector, <Record>{ token: Injector, fn: IDENT, deps: EMPTY, value: this, useNew: false });
    records.set(
      INJECTOR, <Record>{ token: INJECTOR, fn: IDENT, deps: EMPTY, value: this, useNew: false });
    recursivelyProcessProviders(records, providers);
  }

  get<T>(token: Type<T> | InjectionToken<T>, notFoundValue?: T, flags?: InjectFlags): T;
  get(token: any, notFoundValue?: any): any;
  get(token: any, notFoundValue?: any, flags: InjectFlags = InjectFlags.Default): any {
    const record = this._records.get(token);
    try {
      return tryResolveToken(token, record, this._records, this.parent, notFoundValue, flags);
    } catch (e) {
      return catchInjectorError(e, token, 'StaticInjectorError', this.source);
    }
  }

  toString() {
    const tokens = <string[]>[], records = this._records;
    records.forEach((v, token) => tokens.push(stringify(token)));
    return `StaticInjector[${tokens.join(', ')}]`;
  }
}

type SupportedProvider =
  ValueProvider | ExistingProvider | StaticClassProvider | ConstructorProvider | FactoryProvider;

interface Record {
  fn: Function;
  useNew: boolean;
  deps: DependencyRecord[];
  value: any;
}

interface DependencyRecord {
  token: any;
  options: number;
}
/**解析provider对象格式的
 * 返回函数,值,是否new一个,和函数的参数
 */
function resolveProvider(provider: SupportedProvider): Record {
  /**依赖? */
  const deps = computeDeps(provider);
  console.log('deps依赖', deps)
  /**通过工厂,类,直传 */
  let fn: Function = IDENT;
  let value: any = EMPTY;
  let useNew: boolean = false;
  let provide = resolveForwardRef(provider.provide);
  //doc 如果有useValue
  if (USE_VALUE in provider) {
    // We need to use USE_VALUE in provider since provider.useValue could be defined as undefined.
    value = (provider as ValueProvider).useValue;
  } else if ((provider as FactoryProvider).useFactory) {
    fn = (provider as FactoryProvider).useFactory;
  } else if ((provider as ExistingProvider).useExisting) {
    // Just use IDENT
  } else if ((provider as StaticClassProvider).useClass) {
    useNew = true;
    fn = resolveForwardRef((provider as StaticClassProvider).useClass);
  } else if (typeof provide == 'function') {
    useNew = true;
    fn = provide;
  } else {
    throw staticError(
      'StaticProvider does not have [useValue|useFactory|useExisting|useClass] or [provide] is not newable',
      provider);
  }
  return { deps, fn, useNew, value };
}

function multiProviderMixError(token: any) {
  return staticError('Cannot mix multi providers and regular providers', token);
}

function recursivelyProcessProviders(records: Map<any, Record>, provider: StaticProvider) {
  if (provider) {
    provider = resolveForwardRef(provider);
    if (provider instanceof Array) {
      // if we have an array recurse into the array
      for (let i = 0; i < provider.length; i++) {
        recursivelyProcessProviders(records, provider[i]);
      }
    }
    //doc 不支持provider直接传入函数
    else if (typeof provider === 'function') {
      // Functions were supported in ReflectiveInjector, but are not here. For safety give useful
      // error messages
      throw staticError('Function/Class not supported', provider);
    }
    //doc 传入的是一个对象
    else if (provider && typeof provider === 'object' && provider.provide) {
      // At this point we have what looks like a provider: {provide: ?, ....}
      /**配置provider配置里面的provide */
      let token = resolveForwardRef(provider.provide);

      const resolvedProvider = resolveProvider(provider);
      if (provider.multi === true) {
        // This is a multi provider.
        let multiProvider: Record | undefined = records.get(token);
        if (multiProvider) {
          //todo 未知
          if (multiProvider.fn !== MULTI_PROVIDER_FN) {
            throw multiProviderMixError(token);
          }
        } else {
          // Create a placeholder factory which will look up the constituents of the multi provider.
          records.set(token, multiProvider = <Record>{
            token: provider.provide,
            deps: [],
            useNew: false,
            fn: MULTI_PROVIDER_FN,
            value: EMPTY
          });
        }
        // Treat the provider as the token.
        token = provider;
        multiProvider.deps.push({ token, options: OptionFlags.Default });
      }
      const record = records.get(token);
      if (record && record.fn == MULTI_PROVIDER_FN) {
        throw multiProviderMixError(token);
      }
      records.set(token, resolvedProvider);
    } else {
      throw staticError('Unexpected provider', provider);
    }
  }
}

function tryResolveToken(
  token: any, record: Record | undefined, records: Map<any, Record>, parent: Injector,
  notFoundValue: any, flags: InjectFlags): any {
  try {
    return resolveToken(token, record, records, parent, notFoundValue, flags);
  } catch (e) {
    // ensure that 'e' is of type Error.
    if (!(e instanceof Error)) {
      e = new Error(e);
    }
    const path: any[] = e[NG_TEMP_TOKEN_PATH] = e[NG_TEMP_TOKEN_PATH] || [];
    path.unshift(token);
    if (record && record.value == CIRCULAR) {
      // Reset the Circular flag.
      record.value = EMPTY;
    }
    throw e;
  }
}

function resolveToken(
  token: any, record: Record | undefined, records: Map<any, Record>, parent: Injector,
  notFoundValue: any, flags: InjectFlags): any {
  let value;
  //doc 如果有记录并且不是跳过自身查找
  if (record && !(flags & InjectFlags.SkipSelf)) {
    // If we don't have a record, this implies that we don't own the provider hence don't know how
    // to resolve it.
    value = record.value;
    if (value == CIRCULAR) {
      throw Error(NO_NEW_LINE + 'Circular dependency');
    } else if (value === EMPTY) {
      record.value = CIRCULAR;
      let obj = undefined;
      let useNew = record.useNew;
      let fn = record.fn;
      let depRecords = record.deps;
      let deps = EMPTY;
      if (depRecords.length) {
        deps = [];
        for (let i = 0; i < depRecords.length; i++) {
          const depRecord: DependencyRecord = depRecords[i];
          const options = depRecord.options;
          const childRecord =
            options & OptionFlags.CheckSelf ? records.get(depRecord.token) : undefined;
          deps.push(tryResolveToken(
            // Current Token to resolve
            depRecord.token,
            // A record which describes how to resolve the token.
            // If undefined, this means we don't have such a record
            childRecord,
            // Other records we know about.
            records,
            // If we don't know how to resolve dependency and we should not check parent for it,
            // than pass in Null injector.
            !childRecord && !(options & OptionFlags.CheckParent) ? Injector.NULL : parent,
            options & OptionFlags.Optional ? null : Injector.THROW_IF_NOT_FOUND,
            InjectFlags.Default));
        }
      }
      //todo 赋值?
      console.log(value, fn);
      record.value = value = useNew ? new (fn as any)(...deps) : fn.apply(obj, deps);
    }
  } else if (!(flags & InjectFlags.Self)) {
    value = parent.get(token, notFoundValue, InjectFlags.Default);
  }
  return value;
}
/**计算参数?
 * 不止计算参数,其实还会判断这个provider是不是符合规范
 * todo 参数还可以传递一些选项,optinal之类的需要测试
 */
function computeDeps(provider: StaticProvider): DependencyRecord[] {
  let deps: DependencyRecord[] = EMPTY;
  const providerDeps: any[] =
    (provider as ExistingProvider & StaticClassProvider & ConstructorProvider).deps;
  //doc 如果depts里面有值
  if (providerDeps && providerDeps.length) {
    deps = [];
    for (let i = 0; i < providerDeps.length; i++) {
      let options = OptionFlags.Default;
      let token = resolveForwardRef(providerDeps[i]);
      if (token instanceof Array) {
        for (let j = 0, annotations = token; j < annotations.length; j++) {
          const annotation = annotations[j];
          if (annotation instanceof Optional || annotation == Optional) {
            options = options | OptionFlags.Optional;
          } else if (annotation instanceof SkipSelf || annotation == SkipSelf) {
            options = options & ~OptionFlags.CheckSelf;
          } else if (annotation instanceof Self || annotation == Self) {
            options = options & ~OptionFlags.CheckParent;
          } else if (annotation instanceof Inject) {
            token = (annotation as Inject).token;
          } else {
            token = resolveForwardRef(annotation);
          }
        }
      }
      deps.push({ token, options });
    }
  } else if ((provider as ExistingProvider).useExisting) {
    const token = resolveForwardRef((provider as ExistingProvider).useExisting);
    deps = [{ token, options: OptionFlags.Default }];
  }
  //doc 没有deps并且没有useValue会报错(并且之前没用useExisting)
  else if (!providerDeps && !(USE_VALUE in provider)) {
    // useValue & useExisting are the only ones which are exempt from deps all others need it.
    throw staticError('\'deps\' required', provider);
  }
  return deps;
}

function staticError(text: string, obj: any): Error {
  return new Error(formatError(text, obj, 'StaticInjectorError'));
}
