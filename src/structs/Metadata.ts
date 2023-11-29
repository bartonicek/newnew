import { compareAlphaNumeric, minMax } from "@abartonicek/utilities";

export type Metadata<T> = {
  update(value: T): void;
  empty(): void;
};

export class NumericMetadata implements Metadata<number> {
  constructor(public min: number, public max: number) {}

  static of(min: number, max: number) {
    return new NumericMetadata(min, max);
  }

  static default() {
    return NumericMetadata.of(-Infinity, Infinity);
  }

  static from(array: number[]) {
    const [min, max] = minMax(array);
    return NumericMetadata.of(min, max);
  }

  setMin(value: number) {
    this.min = value;
    return this;
  }

  setMax(value: number) {
    this.max = value;
    return this;
  }

  update(value: number) {
    this.min = Math.min(this.min, value);
    this.max = Math.max(this.max, value);
  }

  empty() {
    this.min = -Infinity;
    this.max = Infinity;
  }
}

export class StringMetadata implements Metadata<string> {
  constructor(public values: string[], public sort: boolean) {}

  static of(values: string[], sort = true) {
    return new StringMetadata(values, sort);
  }

  static default() {
    return StringMetadata.of([]);
  }

  static from(array: string[], sort = true) {
    array = Array.from(new Set(array));
    if (sort) array.sort();
    return StringMetadata.of(array, sort);
  }

  update(value: string) {
    if (this.values.indexOf(value) === -1) return;
    this.values.push(value);
    if (this.sort) this.values.sort(compareAlphaNumeric);
  }

  empty() {
    this.values = [];
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
