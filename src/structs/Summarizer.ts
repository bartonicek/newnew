import { Lazy, MapFn, ReduceFn } from "@abartonicek/utilities";
import { isNumericArray, isStringArray } from "../funs";
import {
  ProxyVariable,
  ReducedNumericVariable,
  ReducedReferenceVariable,
  ReducedStringVariable,
  ReferenceVariable,
  StringVariable,
  Variable,
} from "./Variable";

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

  parseVariable(parent?: ProxyVariable<unknown>) {
    const { initialfn, updatefn } = this;
    const array = this.values();

    const args = [initialfn, updatefn, parent] as const;

    // @ts-ignore
    if (isNumericArray(array)) return ReducedNumericVariable.of(array, ...args);
    // @ts-ignore
    if (isStringArray(array)) return ReducedStringVariable.of(array, ...args);
    // @ts-ignore
    else return ReducedReferenceVariable.of(array, ...args);
  }
}
