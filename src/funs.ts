import { NumericVariable, ReferenceVariable, StringVariable } from "./Variable";

export async function fetchJSON(path: string) {
  return await (await fetch(path)).json();
}

export function parseVariable(array: any[]) {
  if (typeof array[0] === "number") return NumericVariable.of(array);
  if (typeof array[0] === "string") return StringVariable.of(array);
  return ReferenceVariable.of(array);
}
