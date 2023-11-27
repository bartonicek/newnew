import {
  allEntries,
  asInt,
  compareAlphaNumeric,
  diff,
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
    private _data: Dataframe<T, any>,
    private _parentIndices?: number[]
  ) {}

  cardinality() {
    return this._cardinality;
  }

  indices() {
    return this._indices;
  }

  parentIndices() {
    return this._parentIndices;
  }

  data() {
    return this._data;
  }

  nest<U extends Variables>(other: Factor<U>) {
    return product(this, other);
  }
}

export function mono(n: number) {
  const indices = [] as number[];
  for (let i = 0; i < n; i++) indices.push(0);
  return new Factor(1, indices, Dataframe.of({}));
}

export function from(variable: StringVariable) {
  const array = variable.values();
  const labels = Array.from(variable.meta().valueSet) as string[];
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

export function bin(
  variable: NumericVariable,
  width?: number,
  anchor?: number
) {
  const array = variable.values();
  const { min, max } = variable.meta() as { min: number; max: number };

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
  const k = Math.max(factor1.cardinality(), factor2.cardinality()) + 1;

  const factor1Indices = factor1.indices();
  const factor2Indices = factor2.indices();

  const dirtyIndices = [] as number[];
  const dirtyUniqueIndices = new Set<number>();

  const factor1Map = {} as Record<number, number>;
  const factor2Map = {} as Record<number, number>;
  const parentMap = {} as Record<number, number>;
  const positionsMap = {} as Record<number, Set<number>>;

  for (let i = 0; i < factor1Indices.length; i++) {
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
  const parentIndices = Object.values(factor1Map);

  for (const [k, v] of allEntries(factor1.data().cols())) {
    cols[k] = ProxyVariable.of(v, parentIndices);
  }

  for (let [k, v] of allEntries(factor2.data().cols())) {
    if (typeof k === "string") while (k in cols) k += "$";
    cols[k] = ProxyVariable.of(v, parentIndices);
  }

  cols[POSITIONS] = ReferenceVariable.of(Object.values(positionsMap));
  cols[PARENT] = ReferenceVariable.of(Object.values(parentMap));

  return new Factor<NormalizeVariables<DisjointUnion<T, U>>>(
    dirtyUniqueIndices.size,
    indices,
    Dataframe.of(cols),
    parentIndices
  );
}
