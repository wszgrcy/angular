/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {AbstractControl, FormArray, FormControl, FormGroup} from '../model';
import {getControlAsyncValidators, getControlValidators, mergeValidators} from '../validators';

import {AbstractControlDirective} from './abstract_control_directive';
import {AbstractFormGroupDirective} from './abstract_form_group_directive';
import {CheckboxControlValueAccessor} from './checkbox_value_accessor';
import {ControlContainer} from './control_container';
import {ControlValueAccessor} from './control_value_accessor';
import {DefaultValueAccessor} from './default_value_accessor';
import {NgControl} from './ng_control';
import {NumberValueAccessor} from './number_value_accessor';
import {RadioControlValueAccessor} from './radio_control_value_accessor';
import {RangeValueAccessor} from './range_value_accessor';
import {FormArrayName} from './reactive_directives/form_group_name';
import {ReactiveErrors} from './reactive_errors';
import {SelectControlValueAccessor} from './select_control_value_accessor';
import {SelectMultipleControlValueAccessor} from './select_multiple_control_value_accessor';
import {AsyncValidatorFn, Validator, ValidatorFn} from './validators';


export function controlPath(name: string|null, parent: ControlContainer): string[] {
  return [...parent.path!, name!];
}

export function setUpControl(control: FormControl, dir: NgControl): void {
  if (typeof ngDevMode === 'undefined' || ngDevMode) {
    if (!control) _throwError(dir, 'Cannot find control with');
    if (!dir.valueAccessor) _throwError(dir, 'No value accessor for form control with');
  }

  setUpValidators(control, dir, /* handleOnValidatorChange */ true);

  dir.valueAccessor!.writeValue(control.value);

  setUpViewChangePipeline(control, dir);
  setUpModelChangePipeline(control, dir);

  setUpBlurPipeline(control, dir);

  setUpDisabledChangeHandler(control, dir);
}

export function cleanUpControl(control: FormControl|null, dir: NgControl) {
  const noop = () => {
    if (typeof ngDevMode === 'undefined' || ngDevMode) {
      _noControlError(dir);
    }
  };

  dir.valueAccessor!.registerOnChange(noop);
  dir.valueAccessor!.registerOnTouched(noop);

  cleanUpValidators(control, dir, /* handleOnValidatorChange */ true);

  if (control) {
    dir._invokeOnDestroyCallbacks();
    control._registerOnCollectionChange(() => {});
  }
}

function registerOnValidatorChange<V>(validators: (V|Validator)[], onChange: () => void): void {
  validators.forEach((validator: (V|Validator)) => {
    if ((<Validator>validator).registerOnValidatorChange)
      (<Validator>validator).registerOnValidatorChange!(onChange);
  });
}

/**
 * Sets up disabled change handler function on a given form control if ControlValueAccessor
 * associated with a given directive instance supports the `setDisabledState` call.
 *
 * @param control Form control where disabled change handler should be setup.
 * @param dir Corresponding directive instance associated with this control.
 */
export function setUpDisabledChangeHandler(control: FormControl, dir: NgControl): void {
  if (dir.valueAccessor!.setDisabledState) {
    const onDisabledChange = (isDisabled: boolean) => {
      dir.valueAccessor!.setDisabledState!(isDisabled);
    };
    control.registerOnDisabledChange(onDisabledChange);

    // Register a callback function to cleanup disabled change handler
    // from a control instance when a directive is destroyed.
    dir._registerOnDestroy(() => {
      control._unregisterOnDisabledChange(onDisabledChange);
    });
  }
}

/**
 * Sets up sync and async directive validators on provided form control.
 * This function merges validators from the directive into the validators of the control.
 *
 * @param control Form control where directive validators should be setup.
 * @param dir Directive instance that contains validators to be setup.
 * @param handleOnValidatorChange Flag that determines whether directive validators should be setup
 *     to handle validator input change.
 */
export function setUpValidators(
    control: AbstractControl, dir: AbstractControlDirective,
    handleOnValidatorChange: boolean): void {
  const validators = getControlValidators(control);
  if (dir.validator !== null) {
    control.setValidators(mergeValidators<ValidatorFn>(validators, dir.validator));
  } else if (typeof validators === 'function') {
    // If sync validators are represented by a single validator function, we force the
    // `Validators.compose` call to happen by executing the `setValidators` function with
    // an array that contains that function. We need this to avoid possible discrepancies in
    // validators behavior, so sync validators are always processed by the `Validators.compose`.
    // Note: we should consider moving this logic inside the `setValidators` function itself, so we
    // have consistent behavior on AbstractControl API level. The same applies to the async
    // validators logic below.
    control.setValidators([validators]);
  }

  const asyncValidators = getControlAsyncValidators(control);
  if (dir.asyncValidator !== null) {
    control.setAsyncValidators(
        mergeValidators<AsyncValidatorFn>(asyncValidators, dir.asyncValidator));
  } else if (typeof asyncValidators === 'function') {
    control.setAsyncValidators([asyncValidators]);
  }

  // Re-run validation when validator binding changes, e.g. minlength=3 -> minlength=4
  if (handleOnValidatorChange) {
    const onValidatorChange = () => control.updateValueAndValidity();
    registerOnValidatorChange<ValidatorFn>(dir._rawValidators, onValidatorChange);
    registerOnValidatorChange<AsyncValidatorFn>(dir._rawAsyncValidators, onValidatorChange);
  }
}

/**
 * Cleans up sync and async directive validators on provided form control.
 * This function reverts the setup performed by the `setUpValidators` function, i.e.
 * removes directive-specific validators from a given control instance.
 *
 * @param control Form control from where directive validators should be removed.
 * @param dir Directive instance that contains validators to be removed.
 * @param handleOnValidatorChange Flag that determines whether directive validators should also be
 *     cleaned up to stop handling validator input change (if previously configured to do so).
 */
export function cleanUpValidators(
    control: AbstractControl|null, dir: AbstractControlDirective,
    handleOnValidatorChange: boolean): void {
  if (control !== null) {
    if (dir.validator !== null) {
      const validators = getControlValidators(control);
      if (Array.isArray(validators) && validators.length > 0) {
        // Filter out directive validator function.
        control.setValidators(validators.filter(validator => validator !== dir.validator));
      }
    }

    if (dir.asyncValidator !== null) {
      const asyncValidators = getControlAsyncValidators(control);
      if (Array.isArray(asyncValidators) && asyncValidators.length > 0) {
        // Filter out directive async validator function.
        control.setAsyncValidators(
            asyncValidators.filter(asyncValidator => asyncValidator !== dir.asyncValidator));
      }
    }
  }

  if (handleOnValidatorChange) {
    // Clear onValidatorChange callbacks by providing a noop function.
    const noop = () => {};
    registerOnValidatorChange<ValidatorFn>(dir._rawValidators, noop);
    registerOnValidatorChange<AsyncValidatorFn>(dir._rawAsyncValidators, noop);
  }
}

function setUpViewChangePipeline(control: FormControl, dir: NgControl): void {
  dir.valueAccessor!.registerOnChange((newValue: any) => {
    control._pendingValue = newValue;
    control._pendingChange = true;
    control._pendingDirty = true;

    if (control.updateOn === 'change') updateControl(control, dir);
  });
}

function setUpBlurPipeline(control: FormControl, dir: NgControl): void {
  dir.valueAccessor!.registerOnTouched(() => {
    control._pendingTouched = true;

    if (control.updateOn === 'blur' && control._pendingChange) updateControl(control, dir);
    if (control.updateOn !== 'submit') control.markAsTouched();
  });
}

function updateControl(control: FormControl, dir: NgControl): void {
  if (control._pendingDirty) control.markAsDirty();
  control.setValue(control._pendingValue, {emitModelToViewChange: false});
  dir.viewToModelUpdate(control._pendingValue);
  control._pendingChange = false;
}

function setUpModelChangePipeline(control: FormControl, dir: NgControl): void {
  const onChange = (newValue: any, emitModelEvent: boolean) => {
    // control -> view
    dir.valueAccessor!.writeValue(newValue);

    // control -> ngModel
    if (emitModelEvent) dir.viewToModelUpdate(newValue);
  };
  control.registerOnChange(onChange);

  // Register a callback function to cleanup onChange handler
  // from a control instance when a directive is destroyed.
  dir._registerOnDestroy(() => {
    control._unregisterOnChange(onChange);
  });
}

export function setUpFormContainer(
    control: FormGroup|FormArray, dir: AbstractFormGroupDirective|FormArrayName) {
  if (control == null && (typeof ngDevMode === 'undefined' || ngDevMode))
    _throwError(dir, 'Cannot find control with');
  setUpValidators(control, dir, /* handleOnValidatorChange */ false);
}

function _noControlError(dir: NgControl) {
  return _throwError(dir, 'There is no FormControl instance attached to form control element with');
}

function _throwError(dir: AbstractControlDirective, message: string): void {
  let messageEnd: string;
  if (dir.path!.length > 1) {
    messageEnd = `path: '${dir.path!.join(' -> ')}'`;
  } else if (dir.path![0]) {
    messageEnd = `name: '${dir.path}'`;
  } else {
    messageEnd = 'unspecified name attribute';
  }
  throw new Error(`${message} ${messageEnd}`);
}

export function isPropertyUpdated(changes: {[key: string]: any}, viewModel: any): boolean {
  if (!changes.hasOwnProperty('model')) return false;
  const change = changes['model'];

  if (change.isFirstChange()) return true;
  return !Object.is(viewModel, change.currentValue);
}

const BUILTIN_ACCESSORS = [
  CheckboxControlValueAccessor,
  RangeValueAccessor,
  NumberValueAccessor,
  SelectControlValueAccessor,
  SelectMultipleControlValueAccessor,
  RadioControlValueAccessor,
];

export function isBuiltInAccessor(valueAccessor: ControlValueAccessor): boolean {
  return BUILTIN_ACCESSORS.some(a => valueAccessor.constructor === a);
}

export function syncPendingControls(form: FormGroup, directives: NgControl[]): void {
  form._syncPendingControls();
  directives.forEach(dir => {
    const control = dir.control as FormControl;
    if (control.updateOn === 'submit' && control._pendingChange) {
      dir.viewToModelUpdate(control._pendingValue);
      control._pendingChange = false;
    }
  });
}

// TODO: vsavkin remove it once https://github.com/angular/angular/issues/3011 is implemented
export function selectValueAccessor(
    dir: NgControl, valueAccessors: ControlValueAccessor[]): ControlValueAccessor|null {
  if (!valueAccessors) return null;

  if (!Array.isArray(valueAccessors) && (typeof ngDevMode === 'undefined' || ngDevMode))
    _throwError(dir, 'Value accessor was not provided as an array for form control with');

  let defaultAccessor: ControlValueAccessor|undefined = undefined;
  let builtinAccessor: ControlValueAccessor|undefined = undefined;
  let customAccessor: ControlValueAccessor|undefined = undefined;

  valueAccessors.forEach((v: ControlValueAccessor) => {
    if (v.constructor === DefaultValueAccessor) {
      defaultAccessor = v;

    } else if (isBuiltInAccessor(v)) {
      if (builtinAccessor && (typeof ngDevMode === 'undefined' || ngDevMode))
        _throwError(dir, 'More than one built-in value accessor matches form control with');
      builtinAccessor = v;

    } else {
      if (customAccessor && (typeof ngDevMode === 'undefined' || ngDevMode))
        _throwError(dir, 'More than one custom value accessor matches form control with');
      customAccessor = v;
    }
  });

  if (customAccessor) return customAccessor;
  if (builtinAccessor) return builtinAccessor;
  if (defaultAccessor) return defaultAccessor;

  if (typeof ngDevMode === 'undefined' || ngDevMode) {
    _throwError(dir, 'No valid value accessor for form control with');
  }
  return null;
}

export function removeListItem<T>(list: T[], el: T): void {
  const index = list.indexOf(el);
  if (index > -1) list.splice(index, 1);
}

// TODO(kara): remove after deprecation period
export function _ngModelWarning(
    name: string, type: {_ngModelWarningSentOnce: boolean},
    instance: {_ngModelWarningSent: boolean}, warningConfig: string|null) {
  if (warningConfig === 'never') return;

  if (((warningConfig === null || warningConfig === 'once') && !type._ngModelWarningSentOnce) ||
      (warningConfig === 'always' && !instance._ngModelWarningSent)) {
    ReactiveErrors.ngModelWarning(name);
    type._ngModelWarningSentOnce = true;
    instance._ngModelWarningSent = true;
  }
}
