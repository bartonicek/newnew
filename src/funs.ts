import { NumericVariable, ReferenceVariable, StringVariable } from "./Variable";

export async function fetchJSON(path: string) {
  return await (await fetch(path)).json();
}

export function parseVariable(array: any[]) {
  if (typeof array[0] === "number") return NumericVariable.of(array);
  if (typeof array[0] === "string") return StringVariable.of(array);
  return ReferenceVariable.of(array);
}

export const zero = () => 0;
export const one = () => 1;
export const empty = () => "";
export function add(x: number, y: number) {
  return x + y;
}

export function longest(x: string, y: string) {
  return y.length > x.length ? y : x;
}
