/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {FileSystem} from '@angular/compiler-cli/src/ngtsc/file_system';
import {ɵParsedMessage, ɵparseMessage} from '@angular/localize';
import {NodePath, PluginObj} from '@babel/core';
import {CallExpression} from '@babel/types';

import {getLocation, isGlobalIdentifier, isNamedIdentifier, unwrapMessagePartsFromLocalizeCall, unwrapSubstitutionsFromLocalizeCall} from '../../source_file_utils';

export function makeEs5ExtractPlugin(
    fs: FileSystem, messages: ɵParsedMessage[], localizeName = '$localize'): PluginObj {
  return {
    visitor: {
      CallExpression(callPath: NodePath<CallExpression>) {
        const calleePath = callPath.get('callee');
        if (isNamedIdentifier(calleePath, localizeName) && isGlobalIdentifier(calleePath)) {
          const [messageParts, messagePartLocations] =
              unwrapMessagePartsFromLocalizeCall(callPath, fs);
          const [expressions, expressionLocations] =
              unwrapSubstitutionsFromLocalizeCall(callPath, fs);
          const [messagePartsArg, expressionsArg] = callPath.get('arguments');
          const location = getLocation(fs, messagePartsArg, expressionsArg);
          const message = ɵparseMessage(
              messageParts, expressions, location, messagePartLocations, expressionLocations);
          messages.push(message);
        }
      }
    }
  };
}
