/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {absoluteFrom, FileSystem, getFileSystem} from '@angular/compiler-cli/src/ngtsc/file_system';
import {runInEachFileSystem} from '@angular/compiler-cli/src/ngtsc/file_system/testing';
import {ɵmakeTemplateObject} from '@angular/localize';
import {NodePath, TransformOptions, transformSync} from '@babel/core';
import generate from '@babel/generator';

import template from '@babel/template';
import {Expression, Identifier, TaggedTemplateExpression, ExpressionStatement, CallExpression, isParenthesizedExpression, numericLiteral, binaryExpression, NumericLiteral} from '@babel/types';
import {isGlobalIdentifier, isNamedIdentifier, isStringLiteralArray, isArrayOfExpressions, unwrapStringLiteralArray, unwrapMessagePartsFromLocalizeCall, wrapInParensIfNecessary, buildLocalizeReplacement, unwrapSubstitutionsFromLocalizeCall, unwrapMessagePartsFromTemplateLiteral, getLocation} from '../src/source_file_utils';

runInEachFileSystem(() => {
  let fs: FileSystem;
  beforeEach(() => fs = getFileSystem());
  describe('utils', () => {
    describe('isNamedIdentifier()', () => {
      it('should return true if the expression is an identifier with name `$localize`', () => {
        const taggedTemplate = getTaggedTemplate('$localize ``;');
        expect(isNamedIdentifier(taggedTemplate.get('tag'), '$localize')).toBe(true);
      });

      it('should return false if the expression is an identifier without the name `$localize`',
         () => {
           const taggedTemplate = getTaggedTemplate('other ``;');
           expect(isNamedIdentifier(taggedTemplate.get('tag'), '$localize')).toBe(false);
         });

      it('should return false if the expression is not an identifier', () => {
        const taggedTemplate = getTaggedTemplate('$localize() ``;');
        expect(isNamedIdentifier(taggedTemplate.get('tag'), '$localize')).toBe(false);
      });
    });

    describe('isGlobalIdentifier()', () => {
      it('should return true if the identifier is at the top level and not declared', () => {
        const taggedTemplate = getTaggedTemplate('$localize ``;');
        expect(isGlobalIdentifier(taggedTemplate.get('tag') as NodePath<Identifier>)).toBe(true);
      });

      it('should return true if the identifier is in a block scope and not declared', () => {
        const taggedTemplate = getTaggedTemplate('function foo() { $localize ``; } foo();');
        expect(isGlobalIdentifier(taggedTemplate.get('tag') as NodePath<Identifier>)).toBe(true);
      });

      it('should return false if the identifier is declared locally', () => {
        const taggedTemplate = getTaggedTemplate('function $localize() {} $localize ``;');
        expect(isGlobalIdentifier(taggedTemplate.get('tag') as NodePath<Identifier>)).toBe(false);
      });

      it('should return false if the identifier is a function parameter', () => {
        const taggedTemplate = getTaggedTemplate('function foo($localize) { $localize ``; }');
        expect(isGlobalIdentifier(taggedTemplate.get('tag') as NodePath<Identifier>)).toBe(false);
      });
    });

    describe('buildLocalizeReplacement', () => {
      it('should interleave the `messageParts` with the `substitutions`', () => {
        const messageParts = ɵmakeTemplateObject(['a', 'b', 'c'], ['a', 'b', 'c']);
        const substitutions = [numericLiteral(1), numericLiteral(2)];
        const expression = buildLocalizeReplacement(messageParts, substitutions);
        expect(generate(expression).code).toEqual('"a" + 1 + "b" + 2 + "c"');
      });

      it('should wrap "binary expression" substitutions in parentheses', () => {
        const messageParts = ɵmakeTemplateObject(['a', 'b'], ['a', 'b']);
        const binary = binaryExpression('+', numericLiteral(1), numericLiteral(2));
        const expression = buildLocalizeReplacement(messageParts, [binary]);
        expect(generate(expression).code).toEqual('"a" + (1 + 2) + "b"');
      });
    });

    describe('unwrapMessagePartsFromLocalizeCall', () => {
      it('should return an array of string literals and locations from a direct call to a tag function',
         () => {
           const localizeCall = getLocalizeCall(`$localize(['a', 'b\\t', 'c'], 1, 2)`);
           const [parts, locations] = unwrapMessagePartsFromLocalizeCall(localizeCall, fs);
           expect(parts).toEqual(['a', 'b\t', 'c']);
           expect(locations).toEqual([
             {
               start: {line: 0, column: 11},
               end: {line: 0, column: 14},
               file: absoluteFrom('/test/file.js'),
               text: `'a'`,
             },
             {
               start: {line: 0, column: 16},
               end: {line: 0, column: 21},
               file: absoluteFrom('/test/file.js'),
               text: `'b\\t'`,
             },
             {
               start: {line: 0, column: 23},
               end: {line: 0, column: 26},
               file: absoluteFrom('/test/file.js'),
               text: `'c'`,
             },
           ]);
         });

      it('should return an array of string literals and locations from a downleveled tagged template',
         () => {
           let localizeCall = getLocalizeCall(
               `$localize(__makeTemplateObject(['a', 'b\\t', 'c'], ['a', 'b\\\\t', 'c']), 1, 2)`);
           const [parts, locations] = unwrapMessagePartsFromLocalizeCall(localizeCall, fs);
           expect(parts).toEqual(['a', 'b\t', 'c']);
           expect(parts.raw).toEqual(['a', 'b\\t', 'c']);
           expect(locations).toEqual([
             {
               start: {line: 0, column: 51},
               end: {line: 0, column: 54},
               file: absoluteFrom('/test/file.js'),
               text: `'a'`,
             },
             {
               start: {line: 0, column: 56},
               end: {line: 0, column: 62},
               file: absoluteFrom('/test/file.js'),
               text: `'b\\\\t'`,
             },
             {
               start: {line: 0, column: 64},
               end: {line: 0, column: 67},
               file: absoluteFrom('/test/file.js'),
               text: `'c'`,
             },
           ]);
         });

      it('should return an array of string literals and locations from a lazy load template helper',
         () => {
           let localizeCall = getLocalizeCall(`
        function _templateObject() {
          var e = _taggedTemplateLiteral(['a', 'b\\t', 'c'], ['a', 'b\\\\t', 'c']);
          return _templateObject = function() { return e }, e
        }
        $localize(_templateObject(), 1, 2)`);
           const [parts, locations] = unwrapMessagePartsFromLocalizeCall(localizeCall, fs);
           expect(parts).toEqual(['a', 'b\t', 'c']);
           expect(parts.raw).toEqual(['a', 'b\\t', 'c']);
           expect(locations).toEqual([
             {
               start: {line: 2, column: 61},
               end: {line: 2, column: 64},
               file: absoluteFrom('/test/file.js'),
               text: `'a'`,
             },
             {
               start: {line: 2, column: 66},
               end: {line: 2, column: 72},
               file: absoluteFrom('/test/file.js'),
               text: `'b\\\\t'`,
             },
             {
               start: {line: 2, column: 74},
               end: {line: 2, column: 77},
               file: absoluteFrom('/test/file.js'),
               text: `'c'`,
             },
           ]);
         });

      it('should remove a lazy load template helper', () => {
        let localizeCall = getLocalizeCall(`
        function _templateObject() {
          var e = _taggedTemplateLiteral(['a', 'b', 'c'], ['a', 'b', 'c']);
          return _templateObject = function() { return e }, e
        }
        $localize(_templateObject(), 1, 2)`);
        const localizeStatement = localizeCall.parentPath as NodePath<ExpressionStatement>;
        const statements = localizeStatement.container as object[];
        expect(statements.length).toEqual(2);
        unwrapMessagePartsFromLocalizeCall(localizeCall, fs);
        expect(statements.length).toEqual(1);
        expect(statements[0]).toBe(localizeStatement.node);
      });
    });

    describe('unwrapSubstitutionsFromLocalizeCall', () => {
      it('should return the substitutions and locations from a direct call to a tag function',
         () => {
           const call = getLocalizeCall(`$localize(['a', 'b\t', 'c'], 1, 2)`);
           const [substitutions, locations] = unwrapSubstitutionsFromLocalizeCall(call, fs);
           expect((substitutions as NumericLiteral[]).map(s => s.value)).toEqual([1, 2]);
           expect(locations).toEqual([
             {
               start: {line: 0, column: 28},
               end: {line: 0, column: 29},
               file: absoluteFrom('/test/file.js'),
               text: '1'
             },
             {
               start: {line: 0, column: 31},
               end: {line: 0, column: 32},
               file: absoluteFrom('/test/file.js'),
               text: '2'
             },
           ]);
         });

      it('should return the substitutions and locations from a downleveled tagged template', () => {
        const call = getLocalizeCall(
            `$localize(__makeTemplateObject(['a', 'b', 'c'], ['a', 'b', 'c']), 1, 2)`);
        const [substitutions, locations] = unwrapSubstitutionsFromLocalizeCall(call, fs);
        expect((substitutions as NumericLiteral[]).map(s => s.value)).toEqual([1, 2]);
        expect(locations).toEqual([
          {
            start: {line: 0, column: 66},
            end: {line: 0, column: 67},
            file: absoluteFrom('/test/file.js'),
            text: '1'
          },
          {
            start: {line: 0, column: 69},
            end: {line: 0, column: 70},
            file: absoluteFrom('/test/file.js'),
            text: '2'
          },
        ]);
      });
    });

    describe('unwrapMessagePartsFromTemplateLiteral', () => {
      it('should return a TemplateStringsArray built from the template literal elements', () => {
        const taggedTemplate = getTaggedTemplate('$localize `a${1}b\\t${2}c`;');
        expect(
            unwrapMessagePartsFromTemplateLiteral(taggedTemplate.get('quasi').get('quasis'), fs)[0])
            .toEqual(ɵmakeTemplateObject(['a', 'b\t', 'c'], ['a', 'b\\t', 'c']));
      });
    });

    describe('wrapInParensIfNecessary', () => {
      it('should wrap the expression in parentheses if it is binary', () => {
        const ast = template.ast`a + b` as ExpressionStatement;
        const wrapped = wrapInParensIfNecessary(ast.expression);
        expect(isParenthesizedExpression(wrapped)).toBe(true);
      });

      it('should return the expression untouched if it is not binary', () => {
        const ast = template.ast`a` as ExpressionStatement;
        const wrapped = wrapInParensIfNecessary(ast.expression);
        expect(isParenthesizedExpression(wrapped)).toBe(false);
      });
    });

    describe('unwrapStringLiteralArray', () => {
      it('should return an array of string from an array expression', () => {
        const array = getFirstExpression(`['a', 'b', 'c']`);
        const [expressions, locations] = unwrapStringLiteralArray(array, fs);
        expect(expressions).toEqual(['a', 'b', 'c']);
        expect(locations).toEqual([
          {
            start: {line: 0, column: 1},
            end: {line: 0, column: 4},
            file: absoluteFrom('/test/file.js'),
            text: `'a'`,
          },
          {
            start: {line: 0, column: 6},
            end: {line: 0, column: 9},
            file: absoluteFrom('/test/file.js'),
            text: `'b'`,
          },
          {
            start: {line: 0, column: 11},
            end: {line: 0, column: 14},
            file: absoluteFrom('/test/file.js'),
            text: `'c'`,
          },
        ]);
      });

      it('should throw an error if any elements of the array are not literal strings', () => {
        const array = getFirstExpression(`['a', 2, 'c']`);
        expect(() => unwrapStringLiteralArray(array, fs))
            .toThrowError(
                'Unexpected messageParts for `$localize` (expected an array of strings).');
      });
    });

    describe('isStringLiteralArray()', () => {
      it('should return true if the ast is an array of strings', () => {
        const ast = template.ast`['a', 'b', 'c']` as ExpressionStatement;
        expect(isStringLiteralArray(ast.expression)).toBe(true);
      });

      it('should return false if the ast is not an array', () => {
        const ast = template.ast`'a'` as ExpressionStatement;
        expect(isStringLiteralArray(ast.expression)).toBe(false);
      });

      it('should return false if at least on of the array elements is not a string', () => {
        const ast = template.ast`['a', 1, 'b']` as ExpressionStatement;
        expect(isStringLiteralArray(ast.expression)).toBe(false);
      });
    });

    describe('isArrayOfExpressions()', () => {
      it('should return true if all the nodes are expressions', () => {
        const call = getFirstExpression<CallExpression>('foo(a, b, c);');
        expect(isArrayOfExpressions(call.get('arguments'))).toBe(true);
      });

      it('should return false if any of the nodes is not an expression', () => {
        const call = getFirstExpression<CallExpression>('foo(a, b, ...c);');
        expect(isArrayOfExpressions(call.get('arguments'))).toBe(false);
      });
    });

    describe('getLocation()', () => {
      it('should return a plain object containing the start, end and file of a NodePath', () => {
        const taggedTemplate = getTaggedTemplate('const x = $localize `message`;', {
          filename: 'src/test.js',
          sourceRoot: '/root',
        });
        const location = getLocation(fs, taggedTemplate)!;
        expect(location).toBeDefined();
        expect(location.start).toEqual({line: 0, column: 10});
        expect(location.start.constructor.name).toEqual('Object');
        expect(location.end).toEqual({line: 0, column: 29});
        expect(location.end?.constructor.name).toEqual('Object');
        expect(location.file).toEqual(absoluteFrom('/root/src/test.js'));
      });

      it('should return `undefined` if the NodePath has no filename', () => {
        const taggedTemplate = getTaggedTemplate(
            'const x = $localize ``;', {sourceRoot: '/root', filename: undefined});
        const location = getLocation(fs, taggedTemplate);
        expect(location).toBeUndefined();
      });
    });
  });
});

function getTaggedTemplate(
    code: string, options?: TransformOptions): NodePath<TaggedTemplateExpression> {
  return getExpressions<TaggedTemplateExpression>(code, options)
      .find(e => e.isTaggedTemplateExpression())!;
}

function getFirstExpression<T extends Expression>(
    code: string, options?: TransformOptions): NodePath<T> {
  return getExpressions<T>(code, options)[0];
}

function getExpressions<T extends Expression>(
    code: string, options?: TransformOptions): NodePath<T>[] {
  const expressions: NodePath<Expression>[] = [];
  transformSync(code, {
    code: false,
    filename: '/test/file.js',
    plugins: [{
      visitor: {
        Expression: (path: NodePath<Expression>) => {
          expressions.push(path);
        }
      }
    }],
    ...options
  });
  return expressions as NodePath<T>[];
}

function getLocalizeCall(code: string): NodePath<CallExpression> {
  let callPaths: NodePath<CallExpression>[] = [];
  transformSync(code, {
    code: false,
    filename: '/test/file.js',
    plugins: [{
      visitor: {
        CallExpression(path) {
          callPaths.push(path);
        }
      }
    }]
  });
  const localizeCall = callPaths.find(p => {
    const callee = p.get('callee');
    return (callee.isIdentifier() && callee.node.name === '$localize');
  });
  if (!localizeCall) {
    throw new Error(`$localize cannot be found in ${code}`);
  }
  return localizeCall;
}
