/****************************************************************************************************
 * PARTIAL FILE: class_bindings.js
 ****************************************************************************************************/
import { Component } from '@angular/core';
import * as i0 from "@angular/core";
export class MyComponent {
    constructor() {
        this.yesToApple = true;
        this.yesToOrange = true;
        this.yesToTomato = false;
    }
}
MyComponent.ɵfac = function MyComponent_Factory(t) { return new (t || MyComponent)(); };
MyComponent.ɵcmp = i0.ɵɵngDeclareComponent({ version: "0.0.0-PLACEHOLDER", type: MyComponent, selector: "ng-component", ngImport: i0, template: { source: `<div
   [class.apple]="yesToApple"
   [class.orange]="yesToOrange"
   [class.tomato]="yesToTomato"></div>`, isInline: true } });
(function () { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassMetadata(MyComponent, [{
        type: Component,
        args: [{
                template: `<div
   [class.apple]="yesToApple"
   [class.orange]="yesToOrange"
   [class.tomato]="yesToTomato"></div>`
            }]
    }], null, null); })();

/****************************************************************************************************
 * PARTIAL FILE: class_bindings.d.ts
 ****************************************************************************************************/
import * as i0 from "@angular/core";
export declare class MyComponent {
    yesToApple: boolean;
    yesToOrange: boolean;
    yesToTomato: boolean;
    static ɵfac: i0.ɵɵFactoryDef<MyComponent, never>;
    static ɵcmp: i0.ɵɵComponentDefWithMeta<MyComponent, "ng-component", never, {}, {}, never, never>;
}

/****************************************************************************************************
 * PARTIAL FILE: style_bindings.js
 ****************************************************************************************************/
import { Component } from '@angular/core';
import * as i0 from "@angular/core";
export class MyComponent {
    constructor() {
        this.color = 'red';
        this.border = '1px solid purple';
        this.transition = 'all 1337ms ease';
    }
}
MyComponent.ɵfac = function MyComponent_Factory(t) { return new (t || MyComponent)(); };
MyComponent.ɵcmp = i0.ɵɵngDeclareComponent({ version: "0.0.0-PLACEHOLDER", type: MyComponent, selector: "ng-component", ngImport: i0, template: { source: `<div
    [style.color]="color"
    [style.border]="border"
    [style.transition]="transition"></div>`, isInline: true } });
(function () { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassMetadata(MyComponent, [{
        type: Component,
        args: [{
                template: `<div
    [style.color]="color"
    [style.border]="border"
    [style.transition]="transition"></div>`
            }]
    }], null, null); })();

/****************************************************************************************************
 * PARTIAL FILE: style_bindings.d.ts
 ****************************************************************************************************/
import * as i0 from "@angular/core";
export declare class MyComponent {
    color: string;
    border: string;
    transition: string;
    static ɵfac: i0.ɵɵFactoryDef<MyComponent, never>;
    static ɵcmp: i0.ɵɵComponentDefWithMeta<MyComponent, "ng-component", never, {}, {}, never, never>;
}

/****************************************************************************************************
 * PARTIAL FILE: mixed_bindings.js
 ****************************************************************************************************/
import { Component } from '@angular/core';
import * as i0 from "@angular/core";
export class MyComponent {
    constructor() {
        this.color = 'red';
        this.border = '1px solid purple';
        this.transition = 'all 1337ms ease';
        this.yesToApple = true;
        this.yesToOrange = true;
        this.yesToTomato = false;
    }
}
MyComponent.ɵfac = function MyComponent_Factory(t) { return new (t || MyComponent)(); };
MyComponent.ɵcmp = i0.ɵɵngDeclareComponent({ version: "0.0.0-PLACEHOLDER", type: MyComponent, selector: "ng-component", ngImport: i0, template: { source: `<div
    [class.apple]="yesToApple"
    [style.color]="color"
    [class.orange]="yesToOrange"
    [style.border]="border"
    [class.tomato]="yesToTomato"
    [style.transition]="transition"></div>`, isInline: true } });
(function () { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassMetadata(MyComponent, [{
        type: Component,
        args: [{
                template: `<div
    [class.apple]="yesToApple"
    [style.color]="color"
    [class.orange]="yesToOrange"
    [style.border]="border"
    [class.tomato]="yesToTomato"
    [style.transition]="transition"></div>`
            }]
    }], null, null); })();

/****************************************************************************************************
 * PARTIAL FILE: mixed_bindings.d.ts
 ****************************************************************************************************/
import * as i0 from "@angular/core";
export declare class MyComponent {
    color: string;
    border: string;
    transition: string;
    yesToApple: boolean;
    yesToOrange: boolean;
    yesToTomato: boolean;
    static ɵfac: i0.ɵɵFactoryDef<MyComponent, never>;
    static ɵcmp: i0.ɵɵComponentDefWithMeta<MyComponent, "ng-component", never, {}, {}, never, never>;
}

/****************************************************************************************************
 * PARTIAL FILE: interpolations_equal_arity.js
 ****************************************************************************************************/
import { Component } from '@angular/core';
import * as i0 from "@angular/core";
export class MyComponent {
    constructor() {
        this.one = '';
    }
}
MyComponent.ɵfac = function MyComponent_Factory(t) { return new (t || MyComponent)(); };
MyComponent.ɵcmp = i0.ɵɵngDeclareComponent({ version: "0.0.0-PLACEHOLDER", type: MyComponent, selector: "ng-component", ngImport: i0, template: { source: `<div
   style.color="a{{one}}b"
   style.border="a{{one}}b"
   style.transition="a{{one}}b"></div>`, isInline: true } });
(function () { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassMetadata(MyComponent, [{
        type: Component,
        args: [{
                template: `<div
   style.color="a{{one}}b"
   style.border="a{{one}}b"
   style.transition="a{{one}}b"></div>`
            }]
    }], null, null); })();

/****************************************************************************************************
 * PARTIAL FILE: interpolations_equal_arity.d.ts
 ****************************************************************************************************/
import * as i0 from "@angular/core";
export declare class MyComponent {
    one: string;
    static ɵfac: i0.ɵɵFactoryDef<MyComponent, never>;
    static ɵcmp: i0.ɵɵComponentDefWithMeta<MyComponent, "ng-component", never, {}, {}, never, never>;
}

/****************************************************************************************************
 * PARTIAL FILE: interpolations_different_arity.js
 ****************************************************************************************************/
import { Component } from '@angular/core';
import * as i0 from "@angular/core";
export class MyComponent {
    constructor() {
        this.one = '';
        this.two = '';
        this.three = '';
    }
}
MyComponent.ɵfac = function MyComponent_Factory(t) { return new (t || MyComponent)(); };
MyComponent.ɵcmp = i0.ɵɵngDeclareComponent({ version: "0.0.0-PLACEHOLDER", type: MyComponent, selector: "ng-component", ngImport: i0, template: { source: `<div
    style.color="a{{one}}b"
    style.border="a{{one}}b"
    style.transition="a{{one}}b{{two}}c"
    style.width="a{{one}}b{{two}}c"
    style.height="a{{one}}b{{two}}c{{three}}d"
    style.top="a{{one}}b{{two}}c{{three}}d"></div>`, isInline: true } });
(function () { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassMetadata(MyComponent, [{
        type: Component,
        args: [{
                template: `<div
    style.color="a{{one}}b"
    style.border="a{{one}}b"
    style.transition="a{{one}}b{{two}}c"
    style.width="a{{one}}b{{two}}c"
    style.height="a{{one}}b{{two}}c{{three}}d"
    style.top="a{{one}}b{{two}}c{{three}}d"></div>`
            }]
    }], null, null); })();

/****************************************************************************************************
 * PARTIAL FILE: interpolations_different_arity.d.ts
 ****************************************************************************************************/
import * as i0 from "@angular/core";
export declare class MyComponent {
    one: string;
    two: string;
    three: string;
    static ɵfac: i0.ɵɵFactoryDef<MyComponent, never>;
    static ɵcmp: i0.ɵɵComponentDefWithMeta<MyComponent, "ng-component", never, {}, {}, never, never>;
}

/****************************************************************************************************
 * PARTIAL FILE: break_different_instructions.js
 ****************************************************************************************************/
import { Component } from '@angular/core';
import * as i0 from "@angular/core";
export class MyComponent {
    constructor() {
        this.one = '';
        this.transition = 'all 1337ms ease';
        this.width = '42px';
        this.yesToApple = true;
        this.yesToOrange = true;
    }
}
MyComponent.ɵfac = function MyComponent_Factory(t) { return new (t || MyComponent)(); };
MyComponent.ɵcmp = i0.ɵɵngDeclareComponent({ version: "0.0.0-PLACEHOLDER", type: MyComponent, selector: "ng-component", ngImport: i0, template: { source: `<div
                    style.color="a{{one}}b"
                    style.border="a{{one}}b"
                    [class.apple]="yesToApple"
                    [style.transition]="transition"
                    [class.orange]="yesToOrange"
                    [style.width]="width"
                    style.height="a{{one}}b"
                    style.top="a{{one}}b"></div>`, isInline: true } });
(function () { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassMetadata(MyComponent, [{
        type: Component,
        args: [{
                template: `<div
                    style.color="a{{one}}b"
                    style.border="a{{one}}b"
                    [class.apple]="yesToApple"
                    [style.transition]="transition"
                    [class.orange]="yesToOrange"
                    [style.width]="width"
                    style.height="a{{one}}b"
                    style.top="a{{one}}b"></div>`
            }]
    }], null, null); })();

/****************************************************************************************************
 * PARTIAL FILE: break_different_instructions.d.ts
 ****************************************************************************************************/
import * as i0 from "@angular/core";
export declare class MyComponent {
    one: string;
    transition: string;
    width: string;
    yesToApple: boolean;
    yesToOrange: boolean;
    static ɵfac: i0.ɵɵFactoryDef<MyComponent, never>;
    static ɵcmp: i0.ɵɵComponentDefWithMeta<MyComponent, "ng-component", never, {}, {}, never, never>;
}

/****************************************************************************************************
 * PARTIAL FILE: break_different_interpolation_instructions.js
 ****************************************************************************************************/
import { Component } from '@angular/core';
import * as i0 from "@angular/core";
export class MyComponent {
    constructor() {
        this.one = '';
        this.two = '';
        this.three = '';
        this.transition = 'all 1337ms ease';
        this.width = '42px';
    }
}
MyComponent.ɵfac = function MyComponent_Factory(t) { return new (t || MyComponent)(); };
MyComponent.ɵcmp = i0.ɵɵngDeclareComponent({ version: "0.0.0-PLACEHOLDER", type: MyComponent, selector: "ng-component", ngImport: i0, template: { source: `<div
    style.color="a{{one}}b"
    style.border="a{{one}}b"
    style.transition="a{{one}}b{{two}}c"
    style.width="a{{one}}b{{two}}c{{three}}d"
    style.height="a{{one}}b"
    style.top="a{{one}}b"></div>`, isInline: true } });
(function () { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassMetadata(MyComponent, [{
        type: Component,
        args: [{
                template: `<div
    style.color="a{{one}}b"
    style.border="a{{one}}b"
    style.transition="a{{one}}b{{two}}c"
    style.width="a{{one}}b{{two}}c{{three}}d"
    style.height="a{{one}}b"
    style.top="a{{one}}b"></div>`
            }]
    }], null, null); })();

/****************************************************************************************************
 * PARTIAL FILE: break_different_interpolation_instructions.d.ts
 ****************************************************************************************************/
import * as i0 from "@angular/core";
export declare class MyComponent {
    one: string;
    two: string;
    three: string;
    transition: string;
    width: string;
    static ɵfac: i0.ɵɵFactoryDef<MyComponent, never>;
    static ɵcmp: i0.ɵɵComponentDefWithMeta<MyComponent, "ng-component", never, {}, {}, never, never>;
}

/****************************************************************************************************
 * PARTIAL FILE: host_bindings.js
 ****************************************************************************************************/
import { Component, HostBinding } from '@angular/core';
import * as i0 from "@angular/core";
export class MyComponent {
    constructor() {
        this.color = 'red';
        this.transition = 'all 1337ms ease';
        this.yesToApple = true;
        this.yesToTomato = false;
        this.border = '1px solid purple';
        this.yesToOrange = true;
    }
}
MyComponent.ɵfac = function MyComponent_Factory(t) { return new (t || MyComponent)(); };
MyComponent.ɵcmp = i0.ɵɵngDeclareComponent({ version: "0.0.0-PLACEHOLDER", type: MyComponent, selector: "ng-component", host: { properties: { "class.apple": "yesToApple", "style.color": "color", "class.tomato": "yesToTomato", "style.transition": "transition", "style.border": "border", "class.orange": "yesToOrange" } }, ngImport: i0, template: { source: '', isInline: true } });
(function () { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassMetadata(MyComponent, [{
        type: Component,
        args: [{
                template: '',
                host: {
                    '[class.apple]': 'yesToApple',
                    '[style.color]': 'color',
                    '[class.tomato]': 'yesToTomato',
                    '[style.transition]': 'transition'
                }
            }]
    }], null, { border: [{
            type: HostBinding,
            args: ['style.border']
        }], yesToOrange: [{
            type: HostBinding,
            args: ['class.orange']
        }] }); })();

/****************************************************************************************************
 * PARTIAL FILE: host_bindings.d.ts
 ****************************************************************************************************/
import * as i0 from "@angular/core";
export declare class MyComponent {
    color: string;
    transition: string;
    yesToApple: boolean;
    yesToTomato: boolean;
    border: string;
    yesToOrange: boolean;
    static ɵfac: i0.ɵɵFactoryDef<MyComponent, never>;
    static ɵcmp: i0.ɵɵComponentDefWithMeta<MyComponent, "ng-component", never, {}, {}, never, never>;
}

