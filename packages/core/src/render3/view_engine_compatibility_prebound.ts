/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */


import {ChangeDetectorRef, injectChangeDetectorRef} from '../change_detection/change_detector_ref';
import {InjectFlags} from '../di/interface/injector';
import {createTemplateRef, TemplateRef} from '../linker/template_ref';
import {throwProviderNotFoundError} from './errors_di';
import {TNode} from './interfaces/node';
import {LView} from './interfaces/view';


/**
 * Retrieves `TemplateRef` instance from `Injector` when a local reference is placed on the
 * `<ng-template>` element.
 *
 * @codeGenApi
 */
export function ɵɵtemplateRefExtractor(tNode: TNode, lView: LView): TemplateRef<any>|null {
  return createTemplateRef(tNode, lView);
}


/**
 * Returns the appropriate `ChangeDetectorRef` for a pipe.
 *
 * @codeGenApi
 */
export function ɵɵinjectPipeChangeDetectorRef(flags = InjectFlags.Default): ChangeDetectorRef|null {
  const value = injectChangeDetectorRef(true);
  if (value == null && !(flags & InjectFlags.Optional)) {
    throwProviderNotFoundError('ChangeDetectorRef');
  } else {
    return value;
  }
}
