import { Lazy, MapFn, ReduceFn, asString } from "@abartonicek/utilities";
import { from } from "./Factor";
import {
  Metadata,
  NoopMetadata,
  NumericMetadata,
  StringMetadata,
} from "./Metadata";
import { Reducer } from "./Summarizer";

export class Variable<T> {
  private _name?: string;
  private _mapping?: string;
  parent?: ProxyVariable<T>;
  metadata: Metadata<T>;

  constructor(public array: T[]) {
    this.metadata = NoopMetadata.default();
  }

  name() {
    return this._name;
  }

  mapping() {
    return this._mapping;
  }

  nameTo(name: string) {
    this._name = name;
    return this;
  }

  mapTo(mapping: string) {
    this._mapping = mapping;
    return this;
  }

  setParent(other: Variable<T>, indices: number[]) {
    this.parent = ProxyVariable.of(other, indices);
    return this;
  }

  n() {
    return this.array.length;
  }

  meta() {
    return this.metadata.values();
  }

  values() {
    return this.array;
  }

  valueAt(position: number) {
    return this.array[position];
  }

  scaledAt(position: number) {
    return this.array[position];
  }

  summarize<U, V>(
    initialize: Lazy<U>,
    update: ReduceFn<T, U>,
    after?: MapFn<U, V>
  ): Reducer<T, U, V> {
    return Reducer.of(this, initialize, update, after);
  }
}

export class NumericVariable extends Variable<number> {
  metadata: NumericMetadata;

  constructor(public array: number[], metadata?: any) {
    super(array);
    this.metadata = metadata ?? NumericMetadata.from(array);
  }

  static of(array: number[]) {
    return new NumericVariable(array);
  }
}

export class StringVariable extends Variable<string> {
  metadata: StringMetadata;

  constructor(public array: string[], metadata?: StringMetadata) {
    array = array.map(asString);
    super(array);
    this.metadata = metadata ?? StringMetadata.from(array);
  }

  static of(array: string[]) {
    return new StringVariable(array);
  }

  asFactor() {
    return from(this);
  }
}

export class ReferenceVariable extends Variable<any> {
  constructor(public array: any[]) {
    super(array);
  }

  static of(array: any[]) {
    return new ReferenceVariable(array);
  }
}

export class ProxyVariable<T> extends Variable<T> {
  constructor(private variable: Variable<T>, public indices: number[]) {
    super(variable.array);
  }

  static of<T>(variable: Variable<T>, indices: number[]) {
    return new ProxyVariable(variable, indices);
  }

  n() {
    return this.indices.length;
  }

  meta() {
    return this.variable.meta();
  }

  values() {
    const n = this.n();
    const result = [] as T[];
    for (let i = 0; i < n; i++) result.push(this.valueAt(i));
    return result;
  }

  valueAt(position: number) {
    return this.variable.valueAt(this.indices[position]);
  }
}

export class ConstantVariable<T> extends Variable<T> {
  constructor(value: T) {
    super([value]);
  }

  static of<T>(value: T) {
    return new ConstantVariable(value);
  }

  valueAt() {
    return super.valueAt(0);
  }
}

type PropsToVariables<T> = { [key in keyof T]: Variable<T[key]> };

export class ArrayVariable<T extends any[]> extends Variable<T> {
  private variables: PropsToVariables<T>;

  constructor(variables: PropsToVariables<T>) {
    super(variables[0].array);
    this.variables = variables;
  }

  static of<T extends any[]>(variables: PropsToVariables<T>) {
    return new ArrayVariable(variables);
  }

  meta() {
    const result = [];
    for (const v of this.variables) result.push(v.meta());
    return result;
  }

  valueAt(position: number) {
    const result = [] as unknown as T;
    for (const v of this.variables) result.push(v.valueAt(position));
    return result;
  }
}

// @ts-ignore
export class ReducedNumericVariable extends NumericVariable {
  parentIndices?: number[];
  scalefn?: MapFn<number, number>;

  constructor(
    public array: number[],
    public initialfn: Lazy<number>,
    public updatefn: ReduceFn<number, number>,
    public parent?: ProxyVariable<number>
  ) {
    super(array);
  }

  static of(
    array: number[],
    initialfn: Lazy<number>,
    updatefn: ReduceFn<number, number>,
    parent?: ProxyVariable<number>
  ) {
    return new ReducedNumericVariable(array, initialfn, updatefn, parent);
  }

  stack() {
    if (!this.parent) return this;

    const parentMeta = this.parent.meta();
    this.metadata.setMax(parentMeta.max);

    const stackVals = [] as number[];
    const parentIndices = this.parent.indices;

    for (let i = 0; i < parentIndices.length; i++) {
      stackVals.push(this.initialfn!());
    }

    for (let i = 0; i < this.array.length; i++) {
      const index = parentIndices[i];
      stackVals[index] = this.updatefn!(stackVals[index], this.array[i]);
      this.array[i] = stackVals[index];
    }

    return this;
  }

  scale(scalefn: MapFn<number, number>) {
    if (!this.parent) return;
    this.scalefn = scalefn;
  }
}

export class ReducedStringVariable extends StringVariable {
  parentIndices?: number[];
  initialfn?: Lazy<string>;
  updatefn?: ReduceFn<string, string>;

  constructor(public array: string[]) {
    super(array);
  }

  static of(array: string[]) {
    return new ReducedStringVariable(array);
  }
}

export class ReducedReferenceVariable extends ReferenceVariable {
  parentIndices?: number[];
  initialfn?: Lazy<any>;
  updatefn?: ReduceFn<any, any>;

  constructor(public array: any[]) {
    super(array);
  }

  static of(array: any[]) {
    return new ReducedStringVariable(array);
  }
}
