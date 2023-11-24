import { Key, Lazy, MapFn, ReduceFn, allEntries } from "@abartonicek/utilities";
import { Accessor } from "solid-js";
import { Factor } from "./Factor";
import { SummarizedVariable, Summarizer } from "./Summarizer";
import {
  ConstantVariable,
  NumericVariable,
  StringVariable,
  Variable,
} from "./Variable";
import { parseVariable } from "./funs";
import { INDICATOR } from "./symbols";
import { NormalizeVariables, RowOf, VariableUnwrap, Variables } from "./types";

type Mapping = "x" | "y" | "size";

type TypeTag = "numeric" | "discrete";
type Summarizers = Record<string, Summarizer<any, any>>;
type NormalizeSummarizers<T> = T extends Summarizer<any, any>
  ? T
  : { [key in keyof T]: NormalizeSummarizers<T[key]> };

export class Dataframe<T extends Variables, U extends Summarizers> {
  columns: T;
  summarizers: U;

  constructor(columns: T, summarizers?: U) {
    this.columns = { ...columns, ...{ [INDICATOR]: ConstantVariable.of(1) } };
    this.summarizers = summarizers ?? ({} as U);
  }

  static of<T extends Variables, U extends Summarizers>(
    columns: T,
    summarizers?: U
  ) {
    return new Dataframe<T, U>(
      { ...columns, ...{ [INDICATOR]: ConstantVariable.of(1) } },
      summarizers
    );
  }

  static parseColumns<T extends Record<string, TypeTag>>(
    rawData: any,
    spec: T
  ) {
    const cols = {} as any;
    let length;

    for (const [k, v] of Object.entries(spec)) {
      const col = rawData[k];

      if (!Array.isArray(col)) errorParseNotArray(k);
      if (length && col.length != length) errorParseLength(k);

      if (v === "numeric") cols[k] = NumericVariable.of(col).setName(k);
      if (v === "discrete") cols[k] = StringVariable.of(col).setName(k);
    }

    return Dataframe.of<
      {
        [key in keyof T]: T[key] extends "numeric"
          ? NumericVariable
          : StringVariable;
      },
      {}
    >(cols);
  }

  n() {
    return Object.values(this.columns)[0].n();
  }

  col<K extends keyof T | typeof INDICATOR>(key: K) {
    return this.columns[key];
  }

  cols<K extends (keyof T | typeof INDICATOR)[]>(...keys: K) {
    const result = [] as any;
    for (const key of keys) result.push(this.columns[key]);
    return result;
  }

  allCols() {
    return this.columns;
  }

  encode(key: keyof T, mapping: Mapping) {
    this.columns[key].setMapping(mapping);
    return this;
  }

  row(index: number, row?: Record<Key, any>) {
    row = row ?? {};
    for (const [k, v] of allEntries(this.columns)) row[k] = v.valueAt(index);
    return row as RowOf<T>;
  }

  rows() {
    const n = this.n();
    const result = [] as RowOf<T>[];
    for (let i = 0; i < n; i++) result.push(this.row(i));

    return result;
  }

  mutate<K extends string, V>(key: K, mutatefn: MapFn<RowOf<T>, V>) {
    const array = [] as V[];
    const n = this.n();
    for (let i = 0; i < n; i++) array.push(mutatefn(this.row(i)));
    const { summarizers, columns: cols } = this as any;
    cols[key] = parseVariable(array);

    return Dataframe.of<T & { [key in K]: Variable<V> }, U>(cols, summarizers);
  }

  summarize<K1 extends keyof T | typeof INDICATOR, K2 extends string, V>(
    key: K1,
    newKey: K2,
    initialize: Lazy<V>,
    update: ReduceFn<VariableUnwrap<T[K1]>, V>
  ) {
    let { columns } = this;
    const summarizers: any = this.summarizers ?? {};
    summarizers[newKey] = columns[key].summarize!(initialize, update);
    return Dataframe.of<
      T,
      NormalizeSummarizers<
        U & { [key in K2]: Summarizer<VariableUnwrap<T[K1]>, V> }
      >
    >(columns, summarizers);
  }

  namedRow(index: number, row?: Record<Key, any>) {
    row = row ?? {};
    for (const [_, col] of allEntries(this.columns)) {
      let name = col.name() ?? `unnamed`;
      while (name in row) name += `$`;
      row[name] = col.valueAt(index);
    }
    return row as { [key in keyof T]: VariableUnwrap<T[key]> };
  }

  partitionBy<V extends Variables>(factor: Accessor<Factor<V>>) {
    return () => {
      const fac = factor();

      const cardinality = fac.cardinality();
      const indices = fac.indices();

      const n = this.n();
      const summaries = {} as Record<string, Summarizer<any, any>>;

      for (const [k, s] of Object.entries(this.summarizers ?? {})) {
        summaries[k] = s.initialize(cardinality);
        for (let i = 0; i < n; i++) summaries[k].update(indices[i], i);
      }

      const cols = {} as any;

      for (const [k, v] of allEntries(summaries)) cols[k] = v.asVariable();
      Object.assign(cols, fac.data().allCols());

      return Dataframe.of<
        NormalizeVariables<
          { [key in keyof U]: SummarizedVariable<U[key]> } & V
        >,
        U
      >(cols, this.summarizers);
    };
  }

  makePartitions<V extends readonly Accessor<Factor<any>>[]>(factors: V) {
    const result = [] as any;
    for (const factor of factors) result.push(this.partitionBy(factor));
    return result as {
      [key in keyof V]: Accessor<
        Dataframe<
          NormalizeVariables<
            {
              [key in keyof U]: SummarizedVariable<U[key]>;
            } & (V[key] extends Accessor<Factor<infer W>> ? W : never)
          >,
          U
        >
      >;
    };
  }
}

function errorParseNotArray(key: string) {
  throw new Error(`Property ${key} is not an array`);
}

function errorParseLength(key: string) {
  throw new Error(
    `Column ${key} has different length from previously seen columns`
  );
}
