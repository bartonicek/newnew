import { Dict, Key } from "@abartonicek/utilities";
import { Variable } from "./structs/Variable";

export type Variables = Record<Key, Variable<any>>;
export type VariableUnwrap<T extends Variable<any>> = T extends Variable<
  infer U
>
  ? U
  : never;

export type NormalizeVariables<T> = T extends Variable<any>
  ? T
  : { [key in keyof T]: NormalizeVariables<T[key]> };

export type DisjointUnion<
  T extends Record<Key, any>,
  U extends Record<Key, any>
> = {
  [K in keyof T]: T[K];
} & {
  [K in keyof U as K extends keyof T ? `${Extract<K, string>}$` : K]: U[K];
};

export type RowOf<T extends Variables> = {
  [key in keyof T]: T[key] extends Variable<infer U> ? U : never;
};

export type PickPropsArray<
  T extends Dict,
  K extends (keyof T)[],
  R extends unknown[] = []
> = K extends [infer First extends keyof T, ...infer Rest extends (keyof T)[]]
  ? PickPropsArray<T, Rest, [...R, T[First]]>
  : R;
