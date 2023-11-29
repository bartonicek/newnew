import { Lazy, MapFn, ReduceFn, asString } from "@abartonicek/utilities";
import { from } from "./Factor";
import { NumericMetadata, StringMetadata } from "./Metadata";
import { ScaleContinuous, ScaleDiscrete } from "./Scale";
import { Reducer } from "./Summarizer";

export type Variable<T> = {
  n(): number | undefined;
  name(): string | undefined;
  mapping(): string | undefined;
  setName(name: string): Variable<T>;
  setMapping(mapping: string): Variable<T>;

  meta(): Record<string, any>;
  values(): T[];
  valueAt(position: number): T;
  scaledAt(position: number): number | undefined | (number | undefined)[];
  summarize<U, V>(
    initialfn: Lazy<U>,
    updatefn: ReduceFn<T, U>,
    afterfn?: MapFn<U, V>
  ): Reducer<T, U, V>;
};

export class VariableInfo {
  private _name?: string;
  private _mapping?: string;

  constructor(private _n?: number) {}

  n() {
    return this._n;
  }

  name() {
    return this._name;
  }

  mapping() {
    return this._mapping;
  }

  setName(name: string) {
    this._name = name;
    return this;
  }

  setMapping(mapping: string) {
    this._mapping = mapping;
    return this;
  }
}

export class NumericVariable extends VariableInfo implements Variable<number> {
  metadata: NumericMetadata;
  scale: ScaleContinuous;

  constructor(public array: number[], metadata?: any) {
    super(array.length);
    this.metadata = metadata ?? NumericMetadata.from(array);
    this.scale = ScaleContinuous.of(this.metadata);
  }

  static of(array: number[]) {
    return new NumericVariable(array);
  }

  meta() {
    return { min: this.metadata.min, max: this.metadata.max };
  }

  values() {
    return this.array;
  }

  valueAt(position: number) {
    return this.array[position];
  }

  scaledAt(position: number) {
    return this.scale.normalize(this.valueAt(position));
  }

  summarize<U, V>(
    initialize: Lazy<U>,
    update: ReduceFn<number, U>
  ): Reducer<number, U, V> {
    return Reducer.of(this, initialize, update);
  }
}

export class StringVariable extends VariableInfo implements Variable<string> {
  metadata: StringMetadata;
  scale: ScaleDiscrete;

  constructor(public array: string[], metadata?: StringMetadata) {
    super(array.length);
    array = array.map(asString);
    this.metadata = metadata ?? StringMetadata.from(array);
    this.scale = ScaleDiscrete.of(this.metadata);
  }

  static of(array: string[]) {
    return new StringVariable(array);
  }

  meta() {
    return this.metadata.values;
  }

  values() {
    return this.array;
  }

  valueAt(position: number) {
    return this.array[position];
  }

  scaledAt(position: number) {
    return this.scale.normalize(this.valueAt(position));
  }

  summarize<U, V>(
    initialize: Lazy<U>,
    update: ReduceFn<string, U>,
    after?: MapFn<U, V>
  ): Reducer<string, U, V> {
    return Reducer.of(this, initialize, update, after);
  }

  asFactor() {
    return from(this);
  }
}

export class ReferenceVariable<T> extends VariableInfo implements Variable<T> {
  constructor(public array: T[]) {
    super(array.length);
  }

  static of<T>(array: T[]) {
    return new ReferenceVariable(array);
  }

  meta() {
    return {};
  }

  values() {
    return this.array;
  }

  valueAt(position: number) {
    return this.array[position];
  }

  scaledAt(position: number) {
    return undefined;
  }

  summarize<U, V>(
    initialize: Lazy<U>,
    update: ReduceFn<T, U>,
    after?: MapFn<U, V>
  ): Reducer<T, U, V> {
    return Reducer.of(this, initialize, update, after);
  }
}

export class ProxyVariable<T> extends VariableInfo implements Variable<T> {
  constructor(private variable: Variable<T>, public indices: number[]) {
    super(indices.length);
  }

  static of<T>(variable: Variable<T>, indices: number[]) {
    return new ProxyVariable(variable, indices);
  }

  summarize<U, V>(
    initialize: Lazy<U>,
    update: ReduceFn<T, U>,
    after?: MapFn<U, V>
  ): Reducer<T, U, V> {
    return Reducer.of(this, initialize, update, after);
  }

  meta() {
    return this.variable.meta();
  }

  values() {
    const n = this.n()!;
    const result = [] as T[];
    for (let i = 0; i < n; i++) result.push(this.valueAt(i));
    return result;
  }

  valueAt(position: number) {
    return this.variable.valueAt(this.indices[position]);
  }

  scaledAt(position: number) {
    return this.variable.scaledAt?.(this.indices[position]);
  }
}

export class ConstantVariable<T> extends VariableInfo implements Variable<T> {
  constructor(private value: T) {
    super();
  }

  static of<T>(value: T) {
    return new ConstantVariable(value);
  }

  meta() {
    return {};
  }

  values() {
    return [this.value];
  }

  summarize<U, V>(
    initialize: Lazy<U>,
    update: ReduceFn<T, U>,
    after?: MapFn<U, V>
  ): Reducer<T, U, V> {
    return Reducer.of(this, initialize, update, after);
  }

  valueAt(position: number) {
    return this.value;
  }

  scaledAt(position: number) {
    return undefined;
  }
}

type PropsToVariables<T> = { [key in keyof T]: Variable<T[key]> };

export class ArrayVariable<T extends any[]>
  extends VariableInfo
  implements Variable<T>
{
  constructor(private variables: PropsToVariables<T>) {
    super(variables[0].n());
  }

  static of<T extends any[]>(variables: PropsToVariables<T>) {
    return new ArrayVariable(variables);
  }

  summarize<U, V>(
    initialize: Lazy<U>,
    update: ReduceFn<T, U>,
    after?: MapFn<U, V>
  ): Reducer<T, U, V> {
    return Reducer.of(this, initialize, update, after);
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

  scaledAt(position: number) {
    const result = [] as (number | undefined)[];
    for (const v of this.variables) result.push(v.scaledAt?.(position) as any);
    return result;
  }

  values() {
    const result = [] as T[];
    const n = this.n()!;
    for (let i = 0; i < n; i++) result.push(this.valueAt(i));
    return result;
  }
}

export class ComputedVariable<T> extends VariableInfo implements Variable<T> {
  constructor(n: number, private computefn: (index: number) => T) {
    super(n);
  }

  static of<T>(n: number, computefn: (index: number) => T) {
    return new ComputedVariable(n, computefn);
  }

  meta() {
    return {};
  }

  values() {
    const result = [] as T[];
    const n = this.n()!;
    for (let i = 0; i < n; i++) result.push(this.valueAt(i));
    return result;
  }

  valueAt(position: number) {
    return this.computefn(position);
  }

  scaledAt(position: number) {
    return undefined;
  }

  summarize<U, V>(
    initialize: Lazy<U>,
    update: ReduceFn<T, U>,
    after?: MapFn<U, V>
  ): Reducer<T, U, V> {
    return Reducer.of(this, initialize, update, after);
  }
}

export class ReducedNumericVariable
  extends VariableInfo
  implements Variable<number>
{
  variable: NumericVariable;
  parentIndices?: number[];
  scalefn?: MapFn<number, number>;

  constructor(
    public array: number[],
    public initialfn: Lazy<number>,
    public updatefn: ReduceFn<number, number>,
    public parent?: ProxyVariable<number>
  ) {
    super(array.length);
    this.variable = NumericVariable.of(array);
    this.variable.metadata.min = initialfn();
  }

  static of(
    array: number[],
    initialfn: Lazy<number>,
    updatefn: ReduceFn<number, number>,
    parent?: ProxyVariable<number>
  ) {
    return new ReducedNumericVariable(array, initialfn, updatefn, parent);
  }

  meta() {
    return this.variable.meta();
  }

  values() {
    return this.array;
  }

  valueAt(position: number) {
    return this.array[position];
  }

  scaledAt(position: number) {
    return this.variable.scaledAt(position);
  }

  summarize<U, V>(
    initialize: Lazy<U>,
    update: ReduceFn<number, U>,
    after?: MapFn<U, V>
  ): Reducer<number, U, V> {
    return Reducer.of(this, initialize, update, after);
  }

  stack() {
    if (!this.parent) return this;

    const parentMeta = this.parent.meta();
    this.variable.metadata.setMax(parentMeta.max);

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

export class ReducedStringVariable
  extends VariableInfo
  implements Variable<string>
{
  variable: StringVariable;
  parentIndices?: number[];
  initialfn?: Lazy<string>;
  updatefn?: ReduceFn<string, string>;

  constructor(public array: string[]) {
    super(array.length);
    this.variable = StringVariable.of(array);
  }

  static of(array: string[]) {
    return new ReducedStringVariable(array);
  }

  meta() {
    return this.variable.metadata.values;
  }

  values() {
    return this.array;
  }

  valueAt(position: number) {
    return this.array[position];
  }

  scaledAt(position: number) {
    return this.variable.scaledAt(position);
  }

  summarize<U, V>(
    initialize: Lazy<U>,
    update: ReduceFn<string, U>,
    after?: MapFn<U, V>
  ): Reducer<string, U, V> {
    return Reducer.of(this, initialize, update, after);
  }
}

export class ReducedReferenceVariable<T>
  extends VariableInfo
  implements ReferenceVariable<T>
{
  variable: ReferenceVariable<T>;
  parentIndices?: number[];
  initialfn?: Lazy<any>;
  updatefn?: ReduceFn<any, any>;

  constructor(public array: any[]) {
    super(array.length);
    this.variable = ReferenceVariable.of(array);
  }

  static of(array: any[]) {
    return new ReducedStringVariable(array);
  }

  meta() {
    return this.variable.meta();
  }

  values() {
    return this.array;
  }

  valueAt(position: number) {
    return this.array[position];
  }

  scaledAt(position: number) {
    return undefined;
  }

  summarize<U, V>(
    initialize: Lazy<U>,
    update: ReduceFn<any, U>,
    after?: MapFn<U, V>
  ): Reducer<any, U, V> {
    return Reducer.of(this, initialize, update, after);
  }
}
