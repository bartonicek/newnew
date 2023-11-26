import { Lazy, ReduceFn } from "@abartonicek/utilities";
import {
  NumericVariable,
  ReferenceVariable,
  StringVariable,
  Variable,
} from "./Variable";
import { parseVariable } from "./funs";

export type ReducedVariable<T extends Reducer<any, any>> = T extends Reducer<
  any,
  infer U
>
  ? U extends number
    ? NumericVariable
    : U extends string
    ? StringVariable
    : ReferenceVariable
  : never;

export class Reducer<T, U> {
  private vals: U[];

  constructor(
    private variable: Variable<T>,
    private initialfn: Lazy<U>,
    private updatefn: ReduceFn<T, U>
  ) {
    this.vals = [];
  }

  static of<T, U>(
    variable: Variable<T>,
    initialfn: Lazy<U>,
    updatefn: ReduceFn<T, U>
  ) {
    return new Reducer(variable, initialfn, updatefn);
  }

  values() {
    return this.vals;
  }

  asVariable() {
    return parseVariable(this.vals);
  }

  initialize(cardinality: number) {
    this.vals = [];
    for (let i = 0; i < cardinality; i++) this.vals.push(this.initialfn());
    return this;
  }

  update(level: number, index: number) {
    const { vals, variable, updatefn } = this;
    const newValue = updatefn(vals[level], variable.valueAt(index));
    vals[level] = newValue;
  }
}
