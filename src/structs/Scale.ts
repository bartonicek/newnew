export type ScaleLike<T> = {
  normalize(value: T): number;
  unnormalize(value: number): T;
};

export class ScaleContinuous implements ScaleLike<number> {
  constructor(private metadata: { min: number; max: number }) {}

  static of(metadata: { min: number; max: number }) {
    return new ScaleContinuous(metadata);
  }

  range() {
    return this.metadata.max - this.metadata.min;
  }

  normalize(value: number) {
    return (value - this.metadata.min) / this.range();
  }

  unnormalize(value: number): number {
    return this.metadata.min + value * this.range();
  }
}

export class ScaleDiscrete implements ScaleLike<string> {
  constructor(private metadata: { values: string[] }) {}

  static of(metadata: { values: string[] }) {
    return new ScaleDiscrete(metadata);
  }

  normalize(value: string) {
    const index = this.metadata.values.indexOf(value);
    if (index === -1) return NaN;
    return (index + 1) / (this.metadata.values.length + 1);
  }

  unnormalize(value: number) {
    return this.metadata.values[
      Math.round(value * (this.metadata.values.length + 1)) - 1
    ];
  }
}
