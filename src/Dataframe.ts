import { Key, Lazy, MapFn, ReduceFn, allEntries } from "@abartonicek/utilities";
import { Accessor } from "solid-js";
import { Factor } from "./Factor";
import { ReducedVariable, Reducer } from "./Summarizer";
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
type Reducers = Record<string, Reducer<any, any, any>>;
type NormalizeReducers<T> = T extends Reducer<any, any, any>
  ? T
  : { [key in keyof T]: NormalizeReducers<T[key]> };

export class Dataframe<T extends Variables, U extends Reducers> {
  columns: T;
  reducers: U;
  parent?: Dataframe<any, any>;

  constructor(columns: T, summarizers?: U) {
    this.columns = { ...columns, ...{ [INDICATOR]: ConstantVariable.of(1) } };
    this.reducers = summarizers ?? ({} as U);
  }

  static of<T extends Variables, U extends Reducers>(
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

  setParent(parent?: Dataframe<any, any>) {
    this.parent = parent;
    return this;
  }

  n() {
    return Object.values(this.columns)[0].n();
  }

  col<K extends keyof T | typeof INDICATOR>(key: K) {
    return this.columns[key];
  }

  cols() {
    return this.columns;
  }

  pickCols<K extends (keyof T | typeof INDICATOR)[]>(...keys: K) {
    const result = [] as any;
    for (const key of keys) result.push(this.columns[key]);
    return result;
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

  summarize<K1 extends keyof T | typeof INDICATOR, K2 extends string, V, W>(
    key: K1,
    newKey: K2,
    initialize: Lazy<V>,
    update: ReduceFn<VariableUnwrap<T[K1]>, V>,
    after?: MapFn<V, W>
  ) {
    let { columns } = this;
    const summarizers: any = this.reducers ?? {};
    summarizers[newKey] = columns[key].summarize!(initialize, update, after);
    return Dataframe.of<
      T,
      NormalizeReducers<
        U & {
          [key in K2]: Reducer<
            VariableUnwrap<
              K1 extends keyof T ? T[K1] : ConstantVariable<number>
            >,
            V,
            W
          >;
        }
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

  partitionBy<V extends Variables>(
    factor: Accessor<Factor<V>>,
    parent?: Accessor<Dataframe<any, any>>
  ) {
    return () => {
      const fac = factor();
      const parentData = parent?.();

      const cardinality = fac.cardinality();
      const indices = fac.indices();

      const n = this.n();
      const summaries = {} as Record<string, Reducer<any, any, any>>;

      for (const [k, r] of Object.entries(this.reducers ?? {})) {
        summaries[k] = r.initialize(cardinality);
        for (let i = 0; i < n; i++) summaries[k].update(indices[i], i);
      }

      const cols = {} as any;
      const parentIndices = fac.parentIndices();

      for (const [k, v] of allEntries(summaries)) {
        cols[k] = v.asVariable(parentData?.col(k), parentIndices);
        if (parentData) cols[k].setParent(parentData?.col(k), parentIndices);
      }

      Object.assign(cols, fac.data().cols());

      return Dataframe.of<
        NormalizeVariables<{ [key in keyof U]: ReducedVariable<U[key]> } & V>,
        U
      >(cols, this.reducers);
    };
  }

  makePartitions<V extends readonly Accessor<Factor<any>>[]>(factors: V) {
    const result = [] as any;
    let parent = undefined as Accessor<Dataframe<any, any>> | undefined;

    for (const factor of factors) {
      const getter = this.partitionBy(factor, parent);
      result.push(getter);
      parent = getter;
    }

    return result as {
      [key in keyof V]: Accessor<
        Dataframe<
          NormalizeVariables<
            {
              [key in keyof U]: ReducedVariable<U[key]>;
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
