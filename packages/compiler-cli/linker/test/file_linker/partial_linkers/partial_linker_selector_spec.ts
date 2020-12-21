/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {LinkerOptions} from '../../..';
import {PartialComponentLinkerVersion1} from '../../../src/file_linker/partial_linkers/partial_component_linker_1';
import {PartialDirectiveLinkerVersion1} from '../../../src/file_linker/partial_linkers/partial_directive_linker_1';
import {PartialLinkerSelector} from '../../../src/file_linker/partial_linkers/partial_linker_selector';

describe('PartialLinkerSelector', () => {
  const options: LinkerOptions = {
    i18nNormalizeLineEndingsInICUs: true,
    enableI18nLegacyMessageIdFormat: false,
    i18nUseExternalIds: false,
  };

  describe('supportsDeclaration()', () => {
    it('should return true if there is at least one linker that matches the given function name',
       () => {
         const selector = new PartialLinkerSelector(options);
         expect(selector.supportsDeclaration('ɵɵngDeclareDirective')).toBe(true);
         expect(selector.supportsDeclaration('ɵɵngDeclareComponent')).toBe(true);
         expect(selector.supportsDeclaration('$foo')).toBe(false);
       });
  });

  describe('getLinker()', () => {
    it('should return the latest linker if the version is "0.0.0-PLACEHOLDER"', () => {
      const selector = new PartialLinkerSelector(options);
      expect(selector.getLinker('ɵɵngDeclareDirective', '0.0.0-PLACEHOLDER'))
          .toBeInstanceOf(PartialDirectiveLinkerVersion1);
      expect(selector.getLinker('ɵɵngDeclareComponent', '0.0.0-PLACEHOLDER'))
          .toBeInstanceOf(PartialComponentLinkerVersion1);
    });

    it('should return the linker that matches the name and valid full version', () => {
      const selector = new PartialLinkerSelector(options);
      expect(selector.getLinker('ɵɵngDeclareDirective', '11.1.2'))
          .toBeInstanceOf(PartialDirectiveLinkerVersion1);
      expect(selector.getLinker('ɵɵngDeclareDirective', '11.2.5'))
          .toBeInstanceOf(PartialDirectiveLinkerVersion1);
      expect(selector.getLinker('ɵɵngDeclareDirective', '12.0.0'))
          .toBeInstanceOf(PartialDirectiveLinkerVersion1);
    });

    it('should return the linker that matches the name and valid pre-release versions', () => {
      const selector = new PartialLinkerSelector(options);
      expect(selector.getLinker('ɵɵngDeclareDirective', '11.1.0-next.1'))
          .toBeInstanceOf(PartialDirectiveLinkerVersion1);
      expect(selector.getLinker('ɵɵngDeclareDirective', '11.1.0-next.7'))
          .toBeInstanceOf(PartialDirectiveLinkerVersion1);
      expect(selector.getLinker('ɵɵngDeclareDirective', '12.0.0-next.7'))
          .toBeInstanceOf(PartialDirectiveLinkerVersion1);
    });

    it('should throw an error if there is no linker that matches the given name or version', () => {
      const selector = new PartialLinkerSelector(options);
      // `$foo` is not a valid name, even though `0.0.0-PLACEHOLDER` is a valid version
      expect(() => selector.getLinker('$foo', '0.0.0-PLACEHOLDER'))
          .toThrowError('Unknown partial declaration function $foo.');
      // `$foo` is not a valid name, even though `11.1.0` is a valid version
      expect(() => selector.getLinker('$foo', '11.1.0'))
          .toThrowError('Unknown partial declaration function $foo.');

      // There are no linkers earlier than 11.1.0-next.1
      expect(() => selector.getLinker('ɵɵngDeclareDirective', '10.2.1'))
          .toThrowError(
              'Unsupported partial declaration version 10.2.1 for ɵɵngDeclareDirective.\n' +
              'Valid version ranges are:\n' +
              ' - 0.0.0-PLACEHOLDER\n' +
              ' - >=11.1.0-next.1');
      expect(() => selector.getLinker('ɵɵngDeclareDirective', '11.0.2'))
          .toThrowError(
              'Unsupported partial declaration version 11.0.2 for ɵɵngDeclareDirective.\n' +
              'Valid version ranges are:\n' +
              ' - 0.0.0-PLACEHOLDER\n' +
              ' - >=11.1.0-next.1');
      expect(() => selector.getLinker('ɵɵngDeclareDirective', '11.1.0-next.0'))
          .toThrowError(
              'Unsupported partial declaration version 11.1.0-next.0 for ɵɵngDeclareDirective.\n' +
              'Valid version ranges are:\n' +
              ' - 0.0.0-PLACEHOLDER\n' +
              ' - >=11.1.0-next.1');
    });
  });
});
