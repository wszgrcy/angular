/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
const Package = require('dgeni').Package;
const gitPackage = require('dgeni-packages/git');
const apiPackage = require('../angular-api-package');
const contentPackage = require('../angular-content-package');
const cliDocsPackage = require('../cli-docs-package');
const { extname, resolve } = require('canonical-path');
const { existsSync } = require('fs');
const { SRC_PATH } = require('../config');

module.exports = new Package('angular.io', [
  gitPackage,
  apiPackage,
  contentPackage, cliDocsPackage
])

  // This processor relies upon the versionInfo. See below...
  .processor(require('./processors/processNavigationMap'))
  .processor(require('./processors/createOverviewDump'))
  .processor(require('./processors/cleanGeneratedFiles'))

  // We don't include this in the angular-base package because the `versionInfo` stuff
  // accesses the file system and git, which is slow.
  /** 
   * versionInfo 貌似是package.json里的相关内容 */
  .config(function (renderDocsProcessor, versionInfo) {
    // Add the version data to the renderer, for use in things like github links
    //doc 渲染用
    renderDocsProcessor.extraData.versionInfo = versionInfo;
  })

  .config(function (checkAnchorLinksProcessor, linkInlineTagDef, renderExamples) {

    // Fail the processing if there is an invalid link
    linkInlineTagDef.failOnBadLink = true;
    //doc 开启检查
    checkAnchorLinksProcessor.$enabled = true;
    // since we encode the HTML to JSON we need to ensure that this processor runs before that encoding happens.
    //doc 变更检查时机
    checkAnchorLinksProcessor.$runBefore = ['convertToJsonProcessor'];
    checkAnchorLinksProcessor.$runAfter = ['fixInternalDocumentLinks'];
    // We only want to check docs that are going to be output as JSON docs.
    //doc 修改检测文档类型
    checkAnchorLinksProcessor.checkDoc = (doc) => doc.path && doc.outputPath && extname(doc.outputPath) === '.json' && doc.docType !== 'json-doc';
    // Since we have a `base[href="/"]` arrangement all links are relative to that and not relative to the source document's path
    checkAnchorLinksProcessor.base = '/';
    // Ignore links to local assets
    // (This is not optimal in terms of performance without making changes to dgeni-packages there is no other way.
    //  That being said do this only add 500ms onto the ~30sec doc-gen run - so not a huge issue)
    //doc 如果是资源类,忽略
    checkAnchorLinksProcessor.ignoredLinks.push({
      test(url) {
        return (existsSync(resolve(SRC_PATH, url)));
      }
    });
    //doc 修改链接可能匹配的链接
    checkAnchorLinksProcessor.pathVariants = ['', '/', '.html', '/index.html', '#top-of-page'];
    //doc 是否异常抛出
    checkAnchorLinksProcessor.errorOnUnmatchedLinks = false;

    // Make sure we fail if the examples are not right
    renderExamples.ignoreBrokenExamples = false;

  })

  .config(function (renderLinkInfo, postProcessHtml) {
    renderLinkInfo.docTypes = postProcessHtml.docTypes;
  });
