import {
  Key,
  Lazy,
  MapFn,
  ReduceFn,
  allEntries,
  allValues,
} from "@abartonicek/utilities";
import { Accessor } from "solid-js";
import { parseVariable } from "../funs";
import { INDICATOR } from "../symbols";
import { Normalize, RowOf, VariableUnwrap, Variables } from "../types";
import { Factor } from "./Factor";
import { ReducedVariable, Reducer } from "./Summarizer";
import {
  ConstantVariable,
  NumericVariable,
  ProxyVariable,
  StringVariable,
  Variable,
} from "./Variable";

type Mapping = "x" | "y" | "size";

type TypeTag = "numeric" | "discrete";
type Reducers = Record<string, Reducer<any, any, any>>;
type NormalizeReducers<T> = T extends Reducer<any, any, any>
  ? T
  : { [key in keyof T]: NormalizeReducers<T[key]> };

export class Dataframe<T extends Variables, U extends Reducers> {
  columns: T;
  reducers: U;

  nVariable?: Variable<any>;
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
    if (this.nVariable) return this.nVariable.n()!;
    for (const col of allValues(this.columns)) {
      if (col.n()) this.nVariable = col;
    }
    if (!this.nVariable) errorN();
    return this.nVariable!.n()!;
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

  stack(key: keyof T & keyof U) {
    // @ts-ignore
    this.columns[key].stack();
    return this;
  }

  row(index: number, row?: Record<Key, any>) {
    row = row ?? {};
    for (const [k, v] of allEntries(this.columns)) {
      row[k] = v.valueAt(index);
    }
    return row as RowOf<T>;
  }

  namedRow(index: number, row?: Record<Key, any>) {
    row = row ?? {};
    for (const [_, col] of allEntries(this.columns)) {
      let name = col.name() ?? `unnamed`;
      while (name in row) name += `$`;
      row[name] = col.valueAt(index);
    }
    return row;
  }

  mappingRow(index: number, row?: Record<Key, any>) {
    row = row ?? {};
    for (const [_, col] of allEntries(this.columns)) {
      let mapping = col.mapping();
      if (!mapping) continue;
      row[mapping] = col.scaledAt?.(index);
    }
    return row;
  }

  rows() {
    const n = this.n();
    const result = [] as RowOf<T>[];
    for (let i = 0; i < n; i++) result.push(this.row(i));

    return result;
  }

  select<V extends Variables>(selectfn: (variables: T) => V) {
    const cols = selectfn(this.columns);
    return Dataframe.of<V, U>(cols);
  }

  select2<V extends Record<string, keyof T>>(spec: V) {
    const cols = {} as any;
    for (const [k, v] of Object.entries(spec)) {
      cols[k] = this.columns[v];
    }
    return Dataframe.of<{ [key in keyof V]: T[V[key]] }, {}>(cols);
  }

  merge<V extends Variables, W extends Reducers>(other: Dataframe<V, W>) {
    const cols = { ...this.columns, ...other.columns };
    const reducers = { ...this.reducers, ...other.reducers };
    return Dataframe.of<Normalize<T & V>, Normalize<U & W>>(cols, reducers);
  }

  mutate<K extends string, V>(key: K, mutatefn: MapFn<RowOf<T>, V>) {
    const array = [] as V[];
    const n = this.n();
    for (let i = 0; i < n; i++) array.push(mutatefn(this.row(i)));
    const { summarizers, columns: cols } = this as any;
    cols[key] = parseVariable(array);

    return Dataframe.of<Normalize<T & { [key in K]: Variable<V> }>, U>(
      cols,
      summarizers
    );
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
      Normalize<
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
        let parentProxy;
        if (parentData) {
          parentProxy = ProxyVariable.of(parentData?.col(k), parentIndices!);
        }
        cols[k] = v.parseVariable(parentProxy);
      }

      Object.assign(cols, fac.data().cols());

      return Dataframe.of<
        Normalize<{ [key in keyof U]: ReducedVariable<U[key]> } & V>,
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
          Normalize<
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

function errorN() {
  throw new Error(`No variable with length in dataframe.`);
}
