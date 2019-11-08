/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {InjectionToken} from '@angular/core';

/**
 * A DI Token representing the main rendering context. In a browser this is the DOM Document.
 * 一个代表这主渲染上下文的ditoken,在浏览器中这个是DOM 文档
 * Note: Document might not be available in the Application Context when Application and Rendering
 * Contexts are not the same (e.g. when running the application in a Web Worker).
 *
 * @publicApi
 * 用来代替document
 */
export const DOCUMENT = new InjectionToken<Document>('DocumentToken');
