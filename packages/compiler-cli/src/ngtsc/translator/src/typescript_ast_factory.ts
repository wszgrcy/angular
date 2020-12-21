/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as ts from 'typescript';

import {AstFactory, BinaryOperator, LeadingComment, ObjectLiteralProperty, SourceMapRange, TemplateLiteral, UnaryOperator, VariableDeclarationType} from './api/ast_factory';

const UNARY_OPERATORS: Record<UnaryOperator, ts.PrefixUnaryOperator> = {
  '+': ts.SyntaxKind.PlusToken,
  '-': ts.SyntaxKind.MinusToken,
  '!': ts.SyntaxKind.ExclamationToken,
};

const BINARY_OPERATORS: Record<BinaryOperator, ts.BinaryOperator> = {
  '&&': ts.SyntaxKind.AmpersandAmpersandToken,
  '>': ts.SyntaxKind.GreaterThanToken,
  '>=': ts.SyntaxKind.GreaterThanEqualsToken,
  '&': ts.SyntaxKind.AmpersandToken,
  '/': ts.SyntaxKind.SlashToken,
  '==': ts.SyntaxKind.EqualsEqualsToken,
  '===': ts.SyntaxKind.EqualsEqualsEqualsToken,
  '<': ts.SyntaxKind.LessThanToken,
  '<=': ts.SyntaxKind.LessThanEqualsToken,
  '-': ts.SyntaxKind.MinusToken,
  '%': ts.SyntaxKind.PercentToken,
  '*': ts.SyntaxKind.AsteriskToken,
  '!=': ts.SyntaxKind.ExclamationEqualsToken,
  '!==': ts.SyntaxKind.ExclamationEqualsEqualsToken,
  '||': ts.SyntaxKind.BarBarToken,
  '+': ts.SyntaxKind.PlusToken,
};

const VAR_TYPES: Record<VariableDeclarationType, ts.NodeFlags> = {
  'const': ts.NodeFlags.Const,
  'let': ts.NodeFlags.Let,
  'var': ts.NodeFlags.None,
};

/**
 * A TypeScript flavoured implementation of the AstFactory.
 */
export class TypeScriptAstFactory implements AstFactory<ts.Statement, ts.Expression> {
  private externalSourceFiles = new Map<string, ts.SourceMapSource>();

  attachComments = attachComments;

  createArrayLiteral = ts.createArrayLiteral;

  createAssignment(target: ts.Expression, value: ts.Expression): ts.Expression {
    return ts.createBinary(target, ts.SyntaxKind.EqualsToken, value);
  }

  createBinaryExpression(
      leftOperand: ts.Expression, operator: BinaryOperator,
      rightOperand: ts.Expression): ts.Expression {
    return ts.createBinary(leftOperand, BINARY_OPERATORS[operator], rightOperand);
  }

  createBlock(body: ts.Statement[]): ts.Statement {
    return ts.createBlock(body);
  }

  createCallExpression(callee: ts.Expression, args: ts.Expression[], pure: boolean): ts.Expression {
    const call = ts.createCall(callee, undefined, args);
    if (pure) {
      ts.addSyntheticLeadingComment(
          call, ts.SyntaxKind.MultiLineCommentTrivia, '@__PURE__', /* trailing newline */ false);
    }
    return call;
  }

  createConditional = ts.createConditional;

  createElementAccess = ts.createElementAccess;

  createExpressionStatement = ts.createExpressionStatement;

  createFunctionDeclaration(functionName: string, parameters: string[], body: ts.Statement):
      ts.Statement {
    if (!ts.isBlock(body)) {
      throw new Error(`Invalid syntax, expected a block, but got ${ts.SyntaxKind[body.kind]}.`);
    }
    return ts.createFunctionDeclaration(
        undefined, undefined, undefined, functionName, undefined,
        parameters.map(param => ts.createParameter(undefined, undefined, undefined, param)),
        undefined, body);
  }

  createFunctionExpression(functionName: string|null, parameters: string[], body: ts.Statement):
      ts.Expression {
    if (!ts.isBlock(body)) {
      throw new Error(`Invalid syntax, expected a block, but got ${ts.SyntaxKind[body.kind]}.`);
    }
    return ts.createFunctionExpression(
        undefined, undefined, functionName ?? undefined, undefined,
        parameters.map(param => ts.createParameter(undefined, undefined, undefined, param)),
        undefined, body);
  }

  createIdentifier = ts.createIdentifier;

  createIfStatement(
      condition: ts.Expression, thenStatement: ts.Statement,
      elseStatement: ts.Statement|null): ts.Statement {
    return ts.createIf(condition, thenStatement, elseStatement ?? undefined);
  }

  createLiteral(value: string|number|boolean|null|undefined): ts.Expression {
    if (value === undefined) {
      return ts.createIdentifier('undefined');
    } else if (value === null) {
      return ts.createNull();
    } else {
      return ts.createLiteral(value);
    }
  }

  createNewExpression(expression: ts.Expression, args: ts.Expression[]): ts.Expression {
    return ts.createNew(expression, undefined, args);
  }

  createObjectLiteral(properties: ObjectLiteralProperty<ts.Expression>[]): ts.Expression {
    return ts.createObjectLiteral(properties.map(
        prop => ts.createPropertyAssignment(
            prop.quoted ? ts.createLiteral(prop.propertyName) :
                          ts.createIdentifier(prop.propertyName),
            prop.value)));
  }

  createParenthesizedExpression = ts.createParen;

  createPropertyAccess = ts.createPropertyAccess;

  createReturnStatement(expression: ts.Expression|null): ts.Statement {
    return ts.createReturn(expression ?? undefined);
  }

  createTaggedTemplate(tag: ts.Expression, template: TemplateLiteral<ts.Expression>):
      ts.Expression {
    let templateLiteral: ts.TemplateLiteral;
    const length = template.elements.length;
    const head = template.elements[0];
    if (length === 1) {
      templateLiteral = ts.createNoSubstitutionTemplateLiteral(head.cooked, head.raw);
    } else {
      const spans: ts.TemplateSpan[] = [];
      // Create the middle parts
      for (let i = 1; i < length - 1; i++) {
        const {cooked, raw, range} = template.elements[i];
        const middle = createTemplateMiddle(cooked, raw);
        if (range !== null) {
          this.setSourceMapRange(middle, range);
        }
        spans.push(ts.createTemplateSpan(template.expressions[i - 1], middle));
      }
      // Create the tail part
      const resolvedExpression = template.expressions[length - 2];
      const templatePart = template.elements[length - 1];
      const templateTail = createTemplateTail(templatePart.cooked, templatePart.raw);
      if (templatePart.range !== null) {
        this.setSourceMapRange(templateTail, templatePart.range);
      }
      spans.push(ts.createTemplateSpan(resolvedExpression, templateTail));
      // Put it all together
      templateLiteral =
          ts.createTemplateExpression(ts.createTemplateHead(head.cooked, head.raw), spans);
    }
    if (head.range !== null) {
      this.setSourceMapRange(templateLiteral, head.range);
    }
    return ts.createTaggedTemplate(tag, templateLiteral);
  }

  createThrowStatement = ts.createThrow;

  createTypeOfExpression = ts.createTypeOf;


  createUnaryExpression(operator: UnaryOperator, operand: ts.Expression): ts.Expression {
    return ts.createPrefix(UNARY_OPERATORS[operator], operand);
  }

  createVariableDeclaration(
      variableName: string, initializer: ts.Expression|null,
      type: VariableDeclarationType): ts.Statement {
    return ts.createVariableStatement(
        undefined,
        ts.createVariableDeclarationList(
            [ts.createVariableDeclaration(variableName, undefined, initializer ?? undefined)],
            VAR_TYPES[type]),
    );
  }

  setSourceMapRange<T extends ts.Node>(node: T, sourceMapRange: SourceMapRange|null): T {
    if (sourceMapRange === null) {
      return node;
    }

    const url = sourceMapRange.url;
    if (!this.externalSourceFiles.has(url)) {
      this.externalSourceFiles.set(
          url, ts.createSourceMapSource(url, sourceMapRange.content, pos => pos));
    }
    const source = this.externalSourceFiles.get(url);
    ts.setSourceMapRange(
        node, {pos: sourceMapRange.start.offset, end: sourceMapRange.end.offset, source});
    return node;
  }
}

// HACK: Use this in place of `ts.createTemplateMiddle()`.
// Revert once https://github.com/microsoft/TypeScript/issues/35374 is fixed.
export function createTemplateMiddle(cooked: string, raw: string): ts.TemplateMiddle {
  const node: ts.TemplateLiteralLikeNode = ts.createTemplateHead(cooked, raw);
  (node.kind as ts.SyntaxKind) = ts.SyntaxKind.TemplateMiddle;
  return node as ts.TemplateMiddle;
}

// HACK: Use this in place of `ts.createTemplateTail()`.
// Revert once https://github.com/microsoft/TypeScript/issues/35374 is fixed.
export function createTemplateTail(cooked: string, raw: string): ts.TemplateTail {
  const node: ts.TemplateLiteralLikeNode = ts.createTemplateHead(cooked, raw);
  (node.kind as ts.SyntaxKind) = ts.SyntaxKind.TemplateTail;
  return node as ts.TemplateTail;
}

/**
 * Attach the given `leadingComments` to the `statement` node.
 *
 * @param statement The statement that will have comments attached.
 * @param leadingComments The comments to attach to the statement.
 */
export function attachComments(statement: ts.Statement, leadingComments: LeadingComment[]): void {
  for (const comment of leadingComments) {
    const commentKind = comment.multiline ? ts.SyntaxKind.MultiLineCommentTrivia :
                                            ts.SyntaxKind.SingleLineCommentTrivia;
    if (comment.multiline) {
      ts.addSyntheticLeadingComment(
          statement, commentKind, comment.toString(), comment.trailingNewline);
    } else {
      for (const line of comment.toString().split('\n')) {
        ts.addSyntheticLeadingComment(statement, commentKind, line, comment.trailingNewline);
      }
    }
  }
}
