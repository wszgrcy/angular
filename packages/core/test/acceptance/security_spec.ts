/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {Component} from '@angular/core';
import {TestBed} from '@angular/core/testing';


describe('comment node text escaping', () => {
  it('should not be possible to do XSS through comment reflect data', () => {
    @Component({template: `<div><span *ngIf="xssValue"></span><div>`})
    class XSSComp {
      xssValue: string = '--> --><script>"evil"</script>';
    }

    TestBed.configureTestingModule({declarations: [XSSComp]});
    const fixture = TestBed.createComponent(XSSComp);
    fixture.detectChanges();
    const div = fixture.nativeElement.querySelector('div') as HTMLElement;
    // Serialize into a string to mimic SSR serialization.
    const html = div.innerHTML;
    // This must be escaped or we have XSS.
    expect(html).not.toContain('--><script');
    // Now parse it back into DOM (from string)
    div.innerHTML = html;
    // Verify that we did not accidentally deserialize the `<script>`
    const script = div.querySelector('script');
    expect(script).toBeFalsy();
  });
});