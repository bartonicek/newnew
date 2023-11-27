import { minMax } from "@abartonicek/utilities";

export type Metadata<T> = {
  update(value: T): void;
  empty(): void;
  values(): Record<string, any>;
};

export class NumericMetadata implements Metadata<number> {
  constructor(private vals: { min: number; max: number }) {}

  static of(vals: { min: number; max: number }) {
    return new NumericMetadata(vals);
  }

  static default() {
    return NumericMetadata.of({ min: -Infinity, max: Infinity });
  }

  static from(array: number[]) {
    const [min, max] = minMax(array);
    return NumericMetadata.of({ min, max });
  }

  values() {
    return this.vals;
  }

  setMin(value: number) {
    this.vals.min = value;
    return this;
  }

  setMax(value: number) {
    this.vals.max = value;
    return this;
  }

  update(value: number) {
    this.vals.min = Math.min(this.vals.min, value);
    this.vals.max = Math.max(this.vals.max, value);
  }

  empty() {
    this.vals.min = -Infinity;
    this.vals.max = Infinity;
  }
}

export class StringMetadata implements Metadata<string> {
  constructor(private vals: { valueSet: Set<string> }) {}

  static of(vals: { valueSet: Set<string> }) {
    return new StringMetadata(vals);
  }

  static default() {
    return StringMetadata.of({ valueSet: new Set() });
  }

  static from(array: string[]) {
    const valueSet = new Set(array);
    return StringMetadata.of({ valueSet });
  }

  values() {
    return this.vals;
  }

  update(value: string) {
    this.vals.valueSet.add(value);
  }

  empty() {
    this.vals.valueSet = new Set();
  }
}

export class NoopMetadata implements Metadata<any> {
  constructor() {}

  static default() {
    return new NoopMetadata();
  }

  values() {
    return {};
  }

  update(value: any) {}
  empty() {}
}
