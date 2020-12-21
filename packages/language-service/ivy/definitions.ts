/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {AST, TmplAstBoundAttribute, TmplAstBoundEvent, TmplAstElement, TmplAstNode, TmplAstTemplate, TmplAstTextAttribute} from '@angular/compiler';
import {NgCompiler} from '@angular/compiler-cli/src/ngtsc/core';
import {isExternalResource} from '@angular/compiler-cli/src/ngtsc/metadata';
import {DirectiveSymbol, DomBindingSymbol, ElementSymbol, ShimLocation, Symbol, SymbolKind, TemplateSymbol} from '@angular/compiler-cli/src/ngtsc/typecheck/api';
import * as ts from 'typescript';

import {getTargetAtPosition} from './template_target';
import {findTightestNode, getParentClassDeclaration} from './ts_utils';
import {flatMap, getDirectiveMatchesForAttribute, getDirectiveMatchesForElementTag, getTemplateInfoAtPosition, getTextSpanOfNode, isDollarEvent, isTypeScriptFile, TemplateInfo, toTextSpan} from './utils';

interface DefinitionMeta {
  node: AST|TmplAstNode;
  parent: AST|TmplAstNode|null;
  symbol: Symbol;
}

interface HasShimLocation {
  shimLocation: ShimLocation;
}

export class DefinitionBuilder {
  constructor(private readonly tsLS: ts.LanguageService, private readonly compiler: NgCompiler) {}

  getDefinitionAndBoundSpan(fileName: string, position: number): ts.DefinitionInfoAndBoundSpan
      |undefined {
    const templateInfo = getTemplateInfoAtPosition(fileName, position, this.compiler);
    if (templateInfo === undefined) {
      // We were unable to get a template at the given position. If we are in a TS file, instead
      // attempt to get an Angular definition at the location inside a TS file (examples of this
      // would be templateUrl or a url in styleUrls).
      if (!isTypeScriptFile(fileName)) {
        return;
      }
      return getDefinitionForExpressionAtPosition(fileName, position, this.compiler);
    }
    const definitionMeta = this.getDefinitionMetaAtPosition(templateInfo, position);
    // The `$event` of event handlers would point to the $event parameter in the shim file, as in
    // `_outputHelper(_t3["x"]).subscribe(function ($event): any { $event }) ;`
    // If we wanted to return something for this, it would be more appropriate for something like
    // `getTypeDefinition`.
    if (definitionMeta === undefined || isDollarEvent(definitionMeta.node)) {
      return undefined;
    }

    const definitions = this.getDefinitionsForSymbol({...definitionMeta, ...templateInfo});
    return {definitions, textSpan: getTextSpanOfNode(definitionMeta.node)};
  }

  private getDefinitionsForSymbol({symbol, node, parent, component}: DefinitionMeta&
                                  TemplateInfo): readonly ts.DefinitionInfo[]|undefined {
    switch (symbol.kind) {
      case SymbolKind.Directive:
      case SymbolKind.Element:
      case SymbolKind.Template:
      case SymbolKind.DomBinding:
        // Though it is generally more appropriate for the above symbol definitions to be
        // associated with "type definitions" since the location in the template is the
        // actual definition location, the better user experience would be to allow
        // LS users to "go to definition" on an item in the template that maps to a class and be
        // taken to the directive or HTML class.
        return this.getTypeDefinitionsForTemplateInstance(symbol, node);
      case SymbolKind.Pipe: {
        if (symbol.tsSymbol !== null) {
          return this.getDefinitionsForSymbols(symbol);
        } else {
          // If there is no `ts.Symbol` for the pipe transform, we want to return the
          // type definition (the pipe class).
          return this.getTypeDefinitionsForSymbols(symbol.classSymbol);
        }
      }
      case SymbolKind.Output:
      case SymbolKind.Input: {
        const bindingDefs = this.getDefinitionsForSymbols(...symbol.bindings);
        // Also attempt to get directive matches for the input name. If there is a directive that
        // has the input name as part of the selector, we want to return that as well.
        const directiveDefs = this.getDirectiveTypeDefsForBindingNode(node, parent, component);
        return [...bindingDefs, ...directiveDefs];
      }
      case SymbolKind.Variable:
      case SymbolKind.Reference: {
        const definitions: ts.DefinitionInfo[] = [];
        if (symbol.declaration !== node) {
          definitions.push({
            name: symbol.declaration.name,
            containerName: '',
            containerKind: ts.ScriptElementKind.unknown,
            kind: ts.ScriptElementKind.variableElement,
            textSpan: getTextSpanOfNode(symbol.declaration),
            contextSpan: toTextSpan(symbol.declaration.sourceSpan),
            fileName: symbol.declaration.sourceSpan.start.file.url,
          });
        }
        if (symbol.kind === SymbolKind.Variable) {
          definitions.push(
              ...this.getDefinitionsForSymbols({shimLocation: symbol.initializerLocation}));
        }
        return definitions;
      }
      case SymbolKind.Expression: {
        return this.getDefinitionsForSymbols(symbol);
      }
    }
  }

  private getDefinitionsForSymbols(...symbols: HasShimLocation[]): ts.DefinitionInfo[] {
    return flatMap(symbols, ({shimLocation}) => {
      const {shimPath, positionInShimFile} = shimLocation;
      return this.tsLS.getDefinitionAtPosition(shimPath, positionInShimFile) ?? [];
    });
  }

  getTypeDefinitionsAtPosition(fileName: string, position: number):
      readonly ts.DefinitionInfo[]|undefined {
    const templateInfo = getTemplateInfoAtPosition(fileName, position, this.compiler);
    if (templateInfo === undefined) {
      return;
    }
    const definitionMeta = this.getDefinitionMetaAtPosition(templateInfo, position);
    if (definitionMeta === undefined) {
      return undefined;
    }

    const {symbol, node} = definitionMeta;
    switch (symbol.kind) {
      case SymbolKind.Directive:
      case SymbolKind.DomBinding:
      case SymbolKind.Element:
      case SymbolKind.Template:
        return this.getTypeDefinitionsForTemplateInstance(symbol, node);
      case SymbolKind.Output:
      case SymbolKind.Input: {
        const bindingDefs = this.getTypeDefinitionsForSymbols(...symbol.bindings);
        // Also attempt to get directive matches for the input name. If there is a directive that
        // has the input name as part of the selector, we want to return that as well.
        const directiveDefs = this.getDirectiveTypeDefsForBindingNode(
            node, definitionMeta.parent, templateInfo.component);
        return [...bindingDefs, ...directiveDefs];
      }
      case SymbolKind.Pipe: {
        if (symbol.tsSymbol !== null) {
          return this.getTypeDefinitionsForSymbols(symbol);
        } else {
          // If there is no `ts.Symbol` for the pipe transform, we want to return the
          // type definition (the pipe class).
          return this.getTypeDefinitionsForSymbols(symbol.classSymbol);
        }
      }
      case SymbolKind.Reference:
        return this.getTypeDefinitionsForSymbols({shimLocation: symbol.targetLocation});
      case SymbolKind.Expression:
        return this.getTypeDefinitionsForSymbols(symbol);
      case SymbolKind.Variable:
        return this.getTypeDefinitionsForSymbols({shimLocation: symbol.initializerLocation});
    }
  }

  private getTypeDefinitionsForTemplateInstance(
      symbol: TemplateSymbol|ElementSymbol|DomBindingSymbol|DirectiveSymbol,
      node: AST|TmplAstNode): ts.DefinitionInfo[] {
    switch (symbol.kind) {
      case SymbolKind.Template: {
        const matches = getDirectiveMatchesForElementTag(symbol.templateNode, symbol.directives);
        return this.getTypeDefinitionsForSymbols(...matches);
      }
      case SymbolKind.Element: {
        const matches = getDirectiveMatchesForElementTag(symbol.templateNode, symbol.directives);
        // If one of the directive matches is a component, we should not include the native element
        // in the results because it is replaced by the component.
        return Array.from(matches).some(dir => dir.isComponent) ?
            this.getTypeDefinitionsForSymbols(...matches) :
            this.getTypeDefinitionsForSymbols(...matches, symbol);
      }
      case SymbolKind.DomBinding: {
        if (!(node instanceof TmplAstTextAttribute)) {
          return [];
        }
        const dirs = getDirectiveMatchesForAttribute(
            node.name, symbol.host.templateNode, symbol.host.directives);
        return this.getTypeDefinitionsForSymbols(...dirs);
      }
      case SymbolKind.Directive:
        return this.getTypeDefinitionsForSymbols(symbol);
    }
  }

  private getDirectiveTypeDefsForBindingNode(
      node: TmplAstNode|AST, parent: TmplAstNode|AST|null, component: ts.ClassDeclaration) {
    if (!(node instanceof TmplAstBoundAttribute) && !(node instanceof TmplAstTextAttribute) &&
        !(node instanceof TmplAstBoundEvent)) {
      return [];
    }
    if (parent === null ||
        !(parent instanceof TmplAstTemplate || parent instanceof TmplAstElement)) {
      return [];
    }
    const templateOrElementSymbol =
        this.compiler.getTemplateTypeChecker().getSymbolOfNode(parent, component);
    if (templateOrElementSymbol === null ||
        (templateOrElementSymbol.kind !== SymbolKind.Template &&
         templateOrElementSymbol.kind !== SymbolKind.Element)) {
      return [];
    }
    const dirs =
        getDirectiveMatchesForAttribute(node.name, parent, templateOrElementSymbol.directives);
    return this.getTypeDefinitionsForSymbols(...dirs);
  }

  private getTypeDefinitionsForSymbols(...symbols: HasShimLocation[]): ts.DefinitionInfo[] {
    return flatMap(symbols, ({shimLocation}) => {
      const {shimPath, positionInShimFile} = shimLocation;
      return this.tsLS.getTypeDefinitionAtPosition(shimPath, positionInShimFile) ?? [];
    });
  }

  private getDefinitionMetaAtPosition({template, component}: TemplateInfo, position: number):
      DefinitionMeta|undefined {
    const target = getTargetAtPosition(template, position);
    if (target === null) {
      return undefined;
    }
    const {nodeInContext, parent} = target;

    const symbol =
        this.compiler.getTemplateTypeChecker().getSymbolOfNode(nodeInContext.node, component);
    if (symbol === null) {
      return undefined;
    }
    return {node: nodeInContext.node, parent, symbol};
  }
}

/**
 * Gets an Angular-specific definition in a TypeScript source file.
 */
function getDefinitionForExpressionAtPosition(
    fileName: string, position: number, compiler: NgCompiler): ts.DefinitionInfoAndBoundSpan|
    undefined {
  const sf = compiler.getNextProgram().getSourceFile(fileName);
  if (sf === undefined) {
    return;
  }

  const expression = findTightestNode(sf, position);
  if (expression === undefined) {
    return;
  }
  const classDeclaration = getParentClassDeclaration(expression);
  if (classDeclaration === undefined) {
    return;
  }
  const componentResources = compiler.getComponentResources(classDeclaration);
  if (componentResources === null) {
    return;
  }

  const allResources = [...componentResources.styles, componentResources.template];

  const resourceForExpression = allResources.find(resource => resource.expression === expression);
  if (resourceForExpression === undefined || !isExternalResource(resourceForExpression)) {
    return;
  }

  const templateDefinitions: ts.DefinitionInfo[] = [{
    kind: ts.ScriptElementKind.externalModuleName,
    name: resourceForExpression.path,
    containerKind: ts.ScriptElementKind.unknown,
    containerName: '',
    // Reading the template is expensive, so don't provide a preview.
    // TODO(ayazhafiz): Consider providing an actual span:
    //  1. We're likely to read the template anyway
    //  2. We could show just the first 100 chars or so
    textSpan: {start: 0, length: 0},
    fileName: resourceForExpression.path,
  }];

  return {
    definitions: templateDefinitions,
    textSpan: {
      // Exclude opening and closing quotes in the url span.
      start: expression.getStart() + 1,
      length: expression.getWidth() - 2,
    },
  };
}
