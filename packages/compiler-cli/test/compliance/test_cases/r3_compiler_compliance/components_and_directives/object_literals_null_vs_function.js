const $c0$ = function () { return { foo: null }; };
const $c1$ = function (a0) { return { foo: a0 }; };
// ...
MyApp.ɵcmp = $r3$.ɵɵdefineComponent({
  type: MyApp,
  selectors: [["ng-component"]],
  decls: 2,
  vars: 5,
  consts: [[__AttributeMarker.Bindings__, "dir"]],
  template:  function MyApp_Template(rf, ctx) {
    if (rf & 1) {
      $r3$.ɵɵelement(0, "div", 0);
      $r3$.ɵɵelement(1, "div", 0);
    }
    if (rf & 2) {
      $r3$.ɵɵproperty("dir", $r3$.ɵɵpureFunction0(2, $c0$));
      $r3$.ɵɵadvance(1);
      $r3$.ɵɵproperty("dir", $r3$.ɵɵpureFunction1(3, $c1$, ctx.getFoo()));
    }
  },
  encapsulation: 2
});
