/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {Directive, ElementRef, forwardRef, Renderer2} from '@angular/core';

import {ControlValueAccessor, NG_VALUE_ACCESSOR} from './control_value_accessor';

export const NUMBER_VALUE_ACCESSOR: any = {
  provide: NG_VALUE_ACCESSOR,
  useExisting: forwardRef(() => NumberValueAccessor),
  multi: true
};

/**
 * @description
 * The `ControlValueAccessor` for writing a number value and listening to number input changes.
 * The value accessor is used by the `FormControlDirective`, `FormControlName`, and `NgModel`
 * directives.
 *
 * @usageNotes
 *
 * ### Using a number input with a reactive form.
 *
 * The following example shows how to use a number input with a reactive form.
 *
 * ```ts
 * const totalCountControl = new FormControl();
 * ```
 *
 * ```
 * <input type="number" [formControl]="totalCountControl">
 * ```
 *
 * @ngModule ReactiveFormsModule
 * @ngModule FormsModule
 * @publicApi
 */
@Directive({
  selector:
      'input[type=number][formControlName],input[type=number][formControl],input[type=number][ngModel]',
  host: {'(input)': 'onChange($event.target.value)', '(blur)': 'onTouched()'},
  providers: [NUMBER_VALUE_ACCESSOR]
})
export class NumberValueAccessor implements ControlValueAccessor {
  /**
   * The registered callback function called when a change or input event occurs on the input
   * element.
   * @nodoc
   */
  onChange = (_: any) => {};

  /**
   * The registered callback function called when a blur event occurs on the input element.
   * @nodoc
   */
  onTouched = () => {};

  constructor(private _renderer: Renderer2, private _elementRef: ElementRef) {}

  /**
   * Sets the "value" property on the input element.
   * @nodoc
   */
  writeValue(value: number): void {
    // The value needs to be normalized for IE9, otherwise it is set to 'null' when null
    const normalizedValue = value == null ? '' : value;
    this._renderer.setProperty(this._elementRef.nativeElement, 'value', normalizedValue);
  }

  /**
   * Registers a function called when the control value changes.
   * @nodoc
   */
  registerOnChange(fn: (_: number|null) => void): void {
    this.onChange = (value) => {
      fn(value == '' ? null : parseFloat(value));
    };
  }

  /**
   * Registers a function called when the control is touched.
   * @nodoc
   */
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  /**
   * Sets the "disabled" property on the input element.
   * @nodoc
   */
  setDisabledState(isDisabled: boolean): void {
    this._renderer.setProperty(this._elementRef.nativeElement, 'disabled', isDisabled);
  }
}
