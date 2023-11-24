import {
  allEntries,
  asInt,
  asString,
  compareAlphaNumeric,
  diff,
  minMax,
} from "@abartonicek/utilities";
import { Dataframe } from "./Dataframe";
import {
  NumericVariable,
  ProxyVariable,
  ReferenceVariable,
  StringVariable,
} from "./Variable";
import { PARENT, POSITIONS } from "./symbols";
import { DisjointUnion, NormalizeVariables, Variables } from "./types";

export class Factor<T extends Variables> {
  constructor(
    private _cardinality: number,
    private _indices: number[],
    private __data: Dataframe<T, any>
  ) {}

  cardinality() {
    return this._cardinality;
  }

  indices() {
    return this._indices;
  }

  data() {
    return this.__data;
  }
}

export function from(array: string[], labels?: string[]) {
  if (!labels) labels = Array.from(new Set(array)).map(asString);
  labels.sort(compareAlphaNumeric);

  const indices = [] as number[];
  const positions = {} as Record<number, Set<number>>;

  for (let i = 0; i < array.length; i++) {
    const index = labels.indexOf(array[i].toString());

    if (!positions[index]) positions[index] = new Set();
    positions[index].add(i);
    indices.push(index);
  }

  const cols = { label: StringVariable.of(labels).setName("label") };
  Object.assign(cols, {
    [POSITIONS]: ReferenceVariable.of(Object.values(positions)),
  });

  const data = Dataframe.of(cols);

  return new Factor(labels.length, indices, data);
}

export function bin(array: number[], width?: number, anchor?: number) {
  const [min, max] = minMax(array);

  const nBins = width ? Math.ceil((max - min) / width) + 1 : 10;
  width = width ?? (max - min) / (nBins - 1);
  anchor = anchor ?? min;

  const breakMin = min - width + ((anchor - min) % width);
  const breakMax = max + width - ((max - anchor) % width);

  const breaks = Array(nBins + 2);
  breaks[0] = breakMin;
  breaks[breaks.length - 1] = breakMax;

  for (let i = 1; i < breaks.length - 1; i++) {
    breaks[i] = breakMin + i * width;
  }

  const dirtyUniqueIndices = new Set<number>();
  const dirtyIndices = [] as number[];
  const positions = {} as Record<number, Set<number>>;

  for (let i = 0; i < array.length; i++) {
    const index = breaks.findIndex((br) => br >= array[i]) - 1;
    if (!positions[index]) positions[index] = new Set();

    positions[index].add(i);
    dirtyUniqueIndices.add(index);
    dirtyIndices.push(index);
  }

  // Need to clean indices/get rid off unused bins

  const sortedDirtyIndices = Array.from(dirtyUniqueIndices).sort(diff);
  const uniqueIndices = new Set<number>();
  const indexMap = {} as Record<number, number>;

  for (const [k, v] of Object.entries(sortedDirtyIndices)) {
    const kk = asInt(k);
    uniqueIndices.add(kk);
    indexMap[v] = kk;
  }

  const indices = dirtyIndices;
  for (let i = 0; i < indices.length; i++) indices[i] = indexMap[indices[i]];

  const binMin = [] as number[];
  const binMax = [] as number[];

  for (const i of sortedDirtyIndices) {
    binMin.push(breaks[i]);
    binMax.push(breaks[i + 1]);
  }

  const cols = {
    bin0: NumericVariable.of(binMin).setName("bin0"),
    bin1: NumericVariable.of(binMax).setName("bin1"),
    [POSITIONS]: ReferenceVariable.of(Object.values(positions)),
  };
  const data = Dataframe.of(cols);

  return new Factor(uniqueIndices.size, indices, data);
}

export function product<T extends Variables, U extends Variables>(
  factor1: Factor<T>,
  factor2: Factor<U>
) {
  const firstCoarser = factor1.cardinality() < factor2.cardinality();
  const finer = firstCoarser ? factor2 : factor1;

  const k = finer.cardinality() + 1;

  const finerIndices = finer.indices();
  const factor1Indices = factor1.indices();
  const factor2Indices = factor2.indices();

  const dirtyIndices = [] as number[];
  const dirtyUniqueIndices = new Set<number>();

  const positionsMap = {} as Record<number, Set<number>>;
  const parentMap = {} as Record<number, number>;
  const factor1Map = {} as Record<number, number>;
  const factor2Map = {} as Record<number, number>;

  for (let i = 0; i < finerIndices.length; i++) {
    const index = k * factor1Indices[i] + factor2Indices[i];

    if (!(index in factor1Map)) {
      factor1Map[index] = factor1Indices[i];
      factor2Map[index] = factor2Indices[i];
      positionsMap[index] = new Set();
      parentMap[index] = factor1Indices[i];
    }

    dirtyIndices.push(index);
    dirtyUniqueIndices.add(index);
    positionsMap[index].add(i);
  }

  const sortedUniqueIndices = Array.from(dirtyUniqueIndices).sort(diff);
  const indices = [] as number[];

  // Need to clean up dirty/unused indices
  for (let i = 0; i < dirtyIndices.length; i++) {
    indices.push(sortedUniqueIndices.indexOf(dirtyIndices[i]));
  }
  //

  let cols = {} as any;

  for (const [k, v] of allEntries(factor1.data().allCols())) {
    cols[k] = ProxyVariable.of(v, Object.values(factor1Map));
  }

  for (let [k, v] of allEntries(factor2.data().allCols())) {
    if (typeof k === "string") while (k in cols) k += "$";
    cols[k] = ProxyVariable.of(v, Object.values(factor2Map));
  }

  cols[POSITIONS] = ReferenceVariable.of(Object.values(positionsMap));
  cols[PARENT] = ReferenceVariable.of(Object.values(parentMap));

  return new Factor<NormalizeVariables<DisjointUnion<T, U>>>(
    dirtyUniqueIndices.size,
    indices,
    Dataframe.of(cols)
  );
}
