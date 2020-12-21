/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {absoluteFrom, getFileSystem, relativeFrom} from '@angular/compiler-cli/src/ngtsc/file_system';
import {runInEachFileSystem} from '@angular/compiler-cli/src/ngtsc/file_system/testing';
import {MockLogger} from '@angular/compiler-cli/src/ngtsc/logging/testing';

import {MessageExtractor} from '../../src/extract/extraction';

runInEachFileSystem(() => {
  describe('extractMessages', () => {
    it('should extract a message for each $localize template tag', () => {
      const fs = getFileSystem();
      const logger = new MockLogger();
      const basePath = absoluteFrom('/root/path/');
      const filename = 'relative/path.js';
      const file = fs.resolve(basePath, filename);
      const extractor = new MessageExtractor(fs, logger, {basePath});
      fs.ensureDir(absoluteFrom('/root/path/relative'));
      fs.writeFile(file, [
        '$localize`:meaning|description:a${1}b${2}c`;',
        '$localize(__makeTemplateObject(["a", ":custom-placeholder:b", "c"], ["a", ":custom-placeholder:b", "c"]), 1, 2);',
        '$localize`:@@custom-id:a${1}b${2}c`;',
      ].join('\n'));
      const messages = extractor.extractMessages(filename);

      expect(messages.length).toEqual(3);

      expect(messages[0]).toEqual({
        id: '2714330828844000684',
        customId: undefined,
        description: 'description',
        meaning: 'meaning',
        messageParts: ['a', 'b', 'c'],
        messagePartLocations: [
          {
            start: {line: 0, column: 10},
            end: {line: 0, column: 32},
            file: absoluteFrom('/root/path/relative/path.js'),
            text: ':meaning|description:a',
          },
          {
            start: {line: 0, column: 36},
            end: {line: 0, column: 37},
            file: absoluteFrom('/root/path/relative/path.js'),
            text: 'b',
          },
          {
            start: {line: 0, column: 41},
            end: {line: 0, column: 42},
            file: absoluteFrom('/root/path/relative/path.js'),
            text: 'c',
          }
        ],
        text: 'a{$PH}b{$PH_1}c',
        placeholderNames: ['PH', 'PH_1'],
        substitutions: jasmine.any(Object),
        substitutionLocations: {
          PH: {
            start: {line: 0, column: 34},
            end: {line: 0, column: 35},
            file: absoluteFrom('/root/path/relative/path.js'),
            text: '1'
          },
          PH_1: {
            start: {line: 0, column: 39},
            end: {line: 0, column: 40},
            file: absoluteFrom('/root/path/relative/path.js'),
            text: '2'
          }
        },
        legacyIds: [],
        location: {
          start: {line: 0, column: 9},
          end: {line: 0, column: 43},
          file,
          text: '`:meaning|description:a${1}b${2}c`',
        },
      });

      expect(messages[1]).toEqual({
        id: '5692770902395945649',
        customId: undefined,
        description: '',
        meaning: '',
        messageParts: ['a', 'b', 'c'],
        messagePartLocations: [
          {
            start: {line: 1, column: 69},
            end: {line: 1, column: 72},
            file: absoluteFrom('/root/path/relative/path.js'),
            text: '"a"',
          },
          {
            start: {line: 1, column: 74},
            end: {line: 1, column: 97},
            file: absoluteFrom('/root/path/relative/path.js'),
            text: '":custom-placeholder:b"',
          },
          {
            start: {line: 1, column: 99},
            end: {line: 1, column: 102},
            file: absoluteFrom('/root/path/relative/path.js'),
            text: '"c"',
          }
        ],
        text: 'a{$custom-placeholder}b{$PH_1}c',
        placeholderNames: ['custom-placeholder', 'PH_1'],
        substitutions: jasmine.any(Object),
        substitutionLocations: {
          'custom-placeholder': {
            start: {line: 1, column: 106},
            end: {line: 1, column: 107},
            file: absoluteFrom('/root/path/relative/path.js'),
            text: '1'
          },
          PH_1: {
            start: {line: 1, column: 109},
            end: {line: 1, column: 110},
            file: absoluteFrom('/root/path/relative/path.js'),
            text: '2'
          }
        },
        legacyIds: [],
        location: {
          start: {line: 1, column: 10},
          end: {line: 1, column: 107},
          file,
          text:
              '__makeTemplateObject(["a", ":custom-placeholder:b", "c"], ["a", ":custom-placeholder:b", "c"])',
        },
      });

      expect(messages[2]).toEqual({
        id: 'custom-id',
        customId: 'custom-id',
        description: '',
        meaning: '',
        messageParts: ['a', 'b', 'c'],
        text: 'a{$PH}b{$PH_1}c',
        placeholderNames: ['PH', 'PH_1'],
        substitutions: jasmine.any(Object),
        substitutionLocations: {
          PH: {
            start: {line: 2, column: 26},
            end: {line: 2, column: 27},
            file: absoluteFrom('/root/path/relative/path.js'),
            text: '1'
          },
          PH_1: {
            start: {line: 2, column: 31},
            end: {line: 2, column: 32},
            file: absoluteFrom('/root/path/relative/path.js'),
            text: '2'
          }
        },
        messagePartLocations: [
          {
            start: {line: 2, column: 10},
            end: {line: 2, column: 24},
            file: absoluteFrom('/root/path/relative/path.js'),
            text: ':@@custom-id:a'
          },
          {
            start: {line: 2, column: 28},
            end: {line: 2, column: 29},
            file: absoluteFrom('/root/path/relative/path.js'),
            text: 'b'
          },
          {
            start: {line: 2, column: 33},
            end: {line: 2, column: 34},
            file: absoluteFrom('/root/path/relative/path.js'),
            text: 'c'
          }
        ],
        legacyIds: [],
        location: {
          start: {line: 2, column: 9},
          end: {line: 2, column: 35},
          file,
          text: '`:@@custom-id:a${1}b${2}c`'
        },
      });
    });
  });
});
