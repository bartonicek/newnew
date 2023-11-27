export type ScaleLike<T> = {
  normalize(value: T): number;
  unnormalize(value: number): T;
};

export class ScaleContinuous implements ScaleLike<number> {
  constructor(private lower: number, private upper: number) {}

  static of(lower: number, upper: number) {
    return new ScaleContinuous(lower, upper);
  }

  setLower(value: number) {
    this.lower = value;
    return this;
  }

  setUpper(value: number) {
    this.upper = value;
    return this;
  }

  range() {
    return this.upper - this.lower;
  }

  normalize(value: number): number {
    return (value - this.lower) / this.range();
  }

  unnormalize(value: number): number {
    return this.lower + value * this.range();
  }
}

export class ScaleDiscrete implements ScaleLike<string> {
  constructor(private values: string[]) {}

  static of(values: string[]) {
    return new ScaleDiscrete(values);
  }

  setValues(values: string[]) {
    this.values = values;
    return this;
  }

  level(value: string) {
    return this.values.indexOf(value);
  }

  normalize(value: string): number {
    return (this.level(value) + 1) / (this.values.length + 1);
  }

  unnormalize(value: number): string {
    return this.values[Math.round(value * (this.values.length + 1)) - 1];
  }
}
