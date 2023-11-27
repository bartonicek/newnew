import {
  NumericVariable,
  ReferenceVariable,
  StringVariable,
} from "./structs/Variable";

export function isNumericArray(array: unknown[]): array is number[] {
  return typeof array[0] === "number";
}

export function isStringArray(array: unknown[]): array is string[] {
  return typeof array[0] === "string";
}

export async function fetchJSON(path: string) {
  return await (await fetch(path)).json();
}

export function parseVariable(array: any[]) {
  if (isNumericArray(array)) return NumericVariable.of(array);
  if (isStringArray(array)) return StringVariable.of(array);
  return ReferenceVariable.of(array);
}

export const zero = () => 0;
export const one = () => 1;
export const empty = () => "";

export function add(x: number, y: number) {
  return x + y;
}

export function times(x: number, y: number) {
  return x * y;
}

export function longest(x: string, y: string) {
  return y.length > x.length ? y : x;
}
