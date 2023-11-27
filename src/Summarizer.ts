import { Lazy, MapFn, ReduceFn } from "@abartonicek/utilities";
import {
  ReducedNumericVariable,
  ReferenceVariable,
  StringVariable,
  Variable,
} from "./Variable";
import { parseReducedVariable } from "./funs";

export type ReducedVariable<T extends Reducer<any, any, any>> =
  T extends Reducer<any, infer U, any>
    ? U extends number
      ? ReducedNumericVariable
      : U extends string
      ? StringVariable
      : ReferenceVariable
    : never;

export class Reducer<T, U, V> {
  private vals: U[];

  constructor(
    private variable: Variable<T>,
    private initialfn: Lazy<U>,
    private updatefn: ReduceFn<T, U>,
    private finallyfn?: MapFn<U, V>
  ) {
    this.vals = [];
  }

  static of<T, U, V>(
    variable: Variable<T>,
    initialfn: Lazy<U>,
    updatefn: ReduceFn<T, U>,
    finallyfn?: MapFn<U, V>
  ) {
    return new Reducer(variable, initialfn, updatefn, finallyfn);
  }

  values() {
    if (!this.finallyfn) return this.vals;
    return this.vals.map(this.finallyfn);
  }

  asVariable(parent?: Variable<V>, parentIndices?: number[]) {
    const variable = parseReducedVariable(this.values());
    if (parent) variable.setParent(parent as any, parentIndices!);
    variable
      // @ts-ignore
      .setReducer?.(this.initialfn, this.updatefn);
    return variable;
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
    return this;
  }
}
