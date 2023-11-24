import { Lazy, ReduceFn, asString } from "@abartonicek/utilities";
import {
  Metadata,
  NoopMetadata,
  NumericMetadata,
  StringMetadata,
} from "./Metadata";
import { Summarizer } from "./Summarizer";

export class Variable<T> {
  private _name?: string;
  private _mapping?: string;
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

  setName(name: string) {
    this._name = name;
    return this;
  }

  setMapping(mapping: string) {
    this._mapping = mapping;
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

  summarize<U>(initialize: Lazy<U>, update: ReduceFn<T, U>): Summarizer<T, U> {
    return Summarizer.of(this, initialize, update);
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
  constructor(private variable: Variable<T>, private indices: number[]) {
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
