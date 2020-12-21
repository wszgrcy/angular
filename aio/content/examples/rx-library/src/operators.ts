// #docplaster
/*
  Because of how the code is merged together using the doc regions,
  we need to indent the imports with the function below.
*/
/* tslint:disable:align */
// #docregion
  import { of } from 'rxjs';
  import { map } from 'rxjs/operators';

// #enddocregion

export function docRegionDefault(console) {
  // #docregion
  const nums = of(1, 2, 3);

  const squareValues = map((val: number) => val * val);
  const squaredNums = squareValues(nums);

  squaredNums.subscribe(x => console.log(x));

  // Logs
  // 1
  // 4
  // 9

  // #enddocregion
}
