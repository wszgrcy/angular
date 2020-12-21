/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {TmplAstTemplate} from '@angular/compiler';
import * as ts from 'typescript';

import {absoluteFrom, getSourceFileOrError} from '../../file_system';
import {runInEachFileSystem} from '../../file_system/testing';
import {getTokenAtPosition} from '../../util/src/typescript';
import {CompletionKind, GlobalCompletion, TemplateTypeChecker, TypeCheckingConfig} from '../api';

import {getClass, setup, TypeCheckingTarget} from './test_utils';

runInEachFileSystem(() => {
  describe('TemplateTypeChecker.getGlobalCompletions()', () => {
    it('should return a completion point in the TCB for the component context', () => {
      const {completions, program} = setupCompletions(`No special template needed`);
      expect(completions.templateContext.size).toBe(0);
      const {shimPath, positionInShimFile} = completions.componentContext;
      const tcbSf = getSourceFileOrError(program, shimPath);
      const node = getTokenAtPosition(tcbSf, positionInShimFile).parent;
      if (!ts.isExpressionStatement(node)) {
        return fail(`Expected a ts.ExpressionStatement`);
      }
      expect(node.expression.getText()).toEqual('ctx.');
      // The position should be between the '.' and a following space.
      expect(tcbSf.text.substr(positionInShimFile - 1, 2)).toEqual('. ');
    });

    it('should return additional completions for references and variables when available', () => {
      const template = `
        <div *ngFor="let user of users">
          <div #innerRef></div>
          <div *ngIf="user">
            <div #notInScope></div>
          </div>
        </div>
        <div #topLevelRef></div>
      `;
      const members = `users: string[];`;
      // Embedded view in question is the first node in the template (index 0).
      const {completions} = setupCompletions(template, members, 0);
      expect(new Set(completions.templateContext.keys())).toEqual(new Set([
        'innerRef', 'user', 'topLevelRef'
      ]));
    });

    it('should support shadowing between outer and inner templates  ', () => {
      const template = `
        <div *ngFor="let user of users">
          Within this template, 'user' should be a variable, not a reference.
        </div>
        <div #user>Out here, 'user' is the reference.</div>
      `;
      const members = `users: string[];`;
      // Completions for the top level.
      const {completions: topLevel} = setupCompletions(template, members);
      // Completions within the embedded view at index 0.
      const {completions: inNgFor} = setupCompletions(template, members, 0);

      expect(topLevel.templateContext.has('user')).toBeTrue();
      const userAtTopLevel = topLevel.templateContext.get('user')!;
      expect(inNgFor.templateContext.has('user')).toBeTrue();
      const userInNgFor = inNgFor.templateContext.get('user')!;

      expect(userAtTopLevel.kind).toBe(CompletionKind.Reference);
      expect(userInNgFor.kind).toBe(CompletionKind.Variable);
    });

    it('should invalidate cached completions when overrides change', () => {
      // The template starts with a #foo local reference.
      const {completions: before, templateTypeChecker, component} =
          setupCompletions('<div #foo></div>');
      expect(Array.from(before.templateContext.keys())).toEqual(['foo']);

      // Override the template and change the name of the local reference to #bar. This should
      // invalidate any cached completions.
      templateTypeChecker.overrideComponentTemplate(component, '<div #bar></div>');

      // Fresh completions should include the #bar reference instead.
      const afterOverride =
          templateTypeChecker.getGlobalCompletions(/* root template */ null, component)!;
      expect(afterOverride).toBeDefined();
      expect(Array.from(afterOverride.templateContext.keys())).toEqual(['bar']);

      // Reset the template to its original. This should also invalidate any cached completions.
      templateTypeChecker.resetOverrides();

      // Fresh completions should include the original #foo now.
      const afterReset =
          templateTypeChecker.getGlobalCompletions(/* root template */ null, component)!;
      expect(afterReset).toBeDefined();
      expect(Array.from(afterReset.templateContext.keys())).toEqual(['foo']);
    });
  });

  describe('TemplateTypeChecker scopes', () => {
    it('should get directives and pipes in scope for a component', () => {
      const MAIN_TS = absoluteFrom('/main.ts');
      const {program, templateTypeChecker} = setup([{
        fileName: MAIN_TS,
        templates: {
          'SomeCmp': 'Not important',
        },
        declarations: [
          {
            type: 'directive',
            file: MAIN_TS,
            name: 'OtherDir',
            selector: 'other-dir',
          },
          {
            type: 'pipe',
            file: MAIN_TS,
            name: 'OtherPipe',
            pipeName: 'otherPipe',
          }
        ],
        source: `
            export class SomeCmp {}
            export class OtherDir {}
            export class OtherPipe {}
            export class SomeCmpModule {}
          `
      }]);
      const sf = getSourceFileOrError(program, MAIN_TS);
      const SomeCmp = getClass(sf, 'SomeCmp');

      const directives = templateTypeChecker.getDirectivesInScope(SomeCmp) ?? [];
      const pipes = templateTypeChecker.getPipesInScope(SomeCmp) ?? [];
      expect(directives.map(dir => dir.selector)).toEqual(['other-dir']);
      expect(pipes.map(pipe => pipe.name)).toEqual(['otherPipe']);
    });
  });
});

function setupCompletions(
    template: string, componentMembers: string = '', inChildTemplateAtIndex: number|null = null): {
  completions: GlobalCompletion,
  program: ts.Program,
  templateTypeChecker: TemplateTypeChecker,
  component: ts.ClassDeclaration,
} {
  const MAIN_TS = absoluteFrom('/main.ts');
  const {templateTypeChecker, programStrategy} = setup(
      [{
        fileName: MAIN_TS,
        templates: {'SomeCmp': template},
        source: `export class SomeCmp { ${componentMembers} }`,
      }],
      ({inlining: false, config: {enableTemplateTypeChecker: true}}));
  const sf = getSourceFileOrError(programStrategy.getProgram(), MAIN_TS);
  const SomeCmp = getClass(sf, 'SomeCmp');

  let context: TmplAstTemplate|null = null;
  if (inChildTemplateAtIndex !== null) {
    const tmpl = templateTypeChecker.getTemplate(SomeCmp)![inChildTemplateAtIndex];
    if (!(tmpl instanceof TmplAstTemplate)) {
      throw new Error(
          `AssertionError: expected TmplAstTemplate at index ${inChildTemplateAtIndex}`);
    }
    context = tmpl;
  }

  const completions = templateTypeChecker.getGlobalCompletions(context, SomeCmp)!;
  expect(completions).toBeDefined();
  return {
    completions,
    program: programStrategy.getProgram(),
    templateTypeChecker,
    component: SomeCmp,
  };
}
