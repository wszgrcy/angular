/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {FileSystem} from '../../../src/ngtsc/file_system';

import {getBuildOutputDirectory, getRootDirectory} from './compile_test';
import {verifyUniqueFactory} from './di_checks';
import {expectEmit} from './expect_emit';
import {replaceMacros} from './expected_file_macros';
import {verifyUniqueFunctions} from './function_checks';
import {ExpectedFile, ExtraCheck} from './get_compliance_tests';
import {verifyPlaceholdersIntegrity, verifyUniqueConsts} from './i18n_checks';
import {checkMappings} from './sourcemap_helpers';

type ExtraCheckFunction = (generated: string, ...extraArgs: any[]) => boolean;
const EXTRA_CHECK_FUNCTIONS: Record<string, ExtraCheckFunction> = {
  verifyPlaceholdersIntegrity,
  verifyUniqueConsts,
  verifyUniqueFactory,
  verifyUniqueFunctions,
};

/**
 * Check that each of the generated files matches the expected files.
 *
 * @param fs The mock file-system that holds the expected and generated files to compare.
 * @param testPath Path to the current test case (relative to the basePath).
 * @param failureMessage The message to display if the expectation fails.
 * @param expectedFiles The list of expected-generated pairs to compare.
 */
export function checkExpectations(
    fs: FileSystem, testPath: string, failureMessage: string, expectedFiles: ExpectedFile[],
    extraChecks: ExtraCheck[]): void {
  const builtDirectory = getBuildOutputDirectory(fs);
  for (const expectedFile of expectedFiles) {
    const expectedPath = fs.resolve(getRootDirectory(fs), expectedFile.expected);
    if (!fs.exists(expectedPath)) {
      throw new Error(`The expected file at ${
          expectedPath} does not exist. Please check the TEST_CASES.json file for this test case.`);
    }

    const generatedPath = fs.resolve(builtDirectory, expectedFile.generated);
    if (!fs.exists(generatedPath)) {
      const error = new Error(
          `The generated file at ${generatedPath} does not exist.\n` +
          'Perhaps there is no matching input source file in the TEST_CASES.json file for this test case.\n' +
          'Or maybe you need to regenerate the GOLDEN_PARTIAL.js file by running:\n\n' +
          `    yarn bazel run //packages/compiler-cli/test/compliance/test_cases:${
              testPath}.golden.update`);
      // Clear the stack so that we get a nice error message
      error.stack = '';
      throw error;
    }
    const generated = fs.readFile(generatedPath);
    let expected = fs.readFile(expectedPath);
    expected = replaceMacros(expected);
    expected = checkMappings(fs, generated, generatedPath, expected);

    expectEmit(
        generated, expected,
        `When checking against expected file "${testPath}/${expectedFile.expected}"\n` +
            failureMessage);

    runExtraChecks(testPath, generated, extraChecks);
  }
}

function runExtraChecks(
    testPath: string, generated: string, extraChecks: (string|[string, ...any])[]): void {
  for (const check of extraChecks) {
    let fnName: string;
    let args: any[];
    if (Array.isArray(check)) {
      [fnName, ...args] = check;
    } else {
      fnName = check;
      args = [];
    }
    const fn = EXTRA_CHECK_FUNCTIONS[fnName];
    if (fn === undefined) {
      throw new Error(
          `Unknown extra-check function: "${fnName}" in ${testPath}.\n` +
          `Possible choices are: ${Object.keys(EXTRA_CHECK_FUNCTIONS).map(f => `\n - ${f}`)}.`);
    }
    if (!fn(generated, ...args)) {
      throw new Error(
          `Extra check ${fnName}(${args.map(arg => JSON.stringify(arg)).join(',')}) in ${
              testPath} failed for generated code:\n\n${generated}`);
    }
  }
}
