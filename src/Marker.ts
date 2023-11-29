import { allEntries, seq } from "@abartonicek/utilities";
import {
  Accessor,
  Setter,
  createEffect,
  createSignal,
  untrack,
} from "solid-js";
import { Dataframe } from "./structs/Dataframe";
import { Factor } from "./structs/Factor";
import {
  ComputedVariable,
  ProxyVariable,
  ReferenceVariable,
} from "./structs/Variable";
import { GROUP, LAYER, POSITIONS, TRANSIENT } from "./symbols";

export const [GROUP1, GROUP2, GROUP3, GROUP4] = [7, 6, 5, 4];

const addTransient = (index: number) => index & ~4;
const stripTransient = (index: number) => index | 4;

const transientGroups = [0, 1, 2, 3];

const group = ReferenceVariable.of([4, 3, 2, 1, 4, 3, 2, 1]);
const layer = ReferenceVariable.of([1, 2, 3, 4, 5, 6, 7, 8]);
const transient = ReferenceVariable.of(Array.from(Array(8), (_, i) => i < 4));

const positionsArray = Array.from(Array(8), () => new Set<number>());
const positions = ReferenceVariable.of(positionsArray);

const cols = {
  [LAYER]: layer,
  [TRANSIENT]: transient,
  [GROUP]: group,
  [POSITIONS]: positions as
    | ReferenceVariable<Set<number>>
    | ComputedVariable<Set<number>>,
};

const markerData = Dataframe.of(cols);

export class Marker {
  data: Dataframe<any, any>;
  transientPositions: Set<number>;
  positionsArray: Set<number>[];

  indices: Accessor<number[]>;
  setIndices: Setter<number[]>;

  asFactor: Accessor<Factor<typeof cols>>;

  constructor(
    private n: number,
    private group: Accessor<number>,
    private selected: Accessor<Set<number>>
  ) {
    this.data = markerData;
    this.positionsArray = positionsArray;
    this.transientPositions = new Set();

    this.positionsArray[7] = new Set(seq(0, n - 1));

    const [indices, setIndices] = createSignal(Array(n).fill(GROUP1));
    this.indices = indices;
    this.setIndices = setIndices;

    this.asFactor = () => new Factor(8, indices(), this.data);
    createEffect(() => this.update());
  }

  static of(
    n: number,
    group: Accessor<number>,
    selected: Accessor<Set<number>>
  ) {
    return new Marker(n, group, selected);
  }

  hasTransient() {
    return this.transientPositions.size > 0;
  }

  update = () => {
    const { positionsArray, transientPositions } = this;
    const [selected, group] = [this.selected(), untrack(this.group)];
    const indices = [...untrack(this.indices)];

    if (!selected.size) return;

    for (const positions of positionsArray) {
      for (const i of selected) positions.delete(i);
    }

    if (group === 0) {
      transientPositions.clear();

      for (const i of selected) {
        const index = addTransient(indices[i]);
        indices[i] = index;
        positionsArray[index].add(i);
        transientPositions.add(i);
      }
    } else {
      for (const i of selected) {
        indices[i] = group;
        positionsArray[group].add(i);
      }
    }

    this.setIndices(indices);
  };

  clearAll() {
    const { n, positionsArray } = this;
    for (const positions of positionsArray) positions.clear();
    for (let i = 0; i < n; i++) positionsArray[GROUP1].add(i);
    this.setIndices(Array(n).fill(GROUP1));
  }

  clearTransient() {
    const { n, positionsArray, transientPositions } = this;
    const indices = [...untrack(this.indices)];

    for (const i of transientGroups) positionsArray[i].clear();
    for (let i = 0; i < n; i++) indices[i] = stripTransient(indices[i]);
    transientPositions.clear();

    this.setIndices(indices);
  }

  proxyData() {
    const factor = this.asFactor();

    const cols = factor.data().cols();
    const indices = factor.indices();

    for (const [k, v] of allEntries(cols)) {
      cols[k] = ProxyVariable.of(v as any, indices) as any;
    }
    cols[POSITIONS] = ComputedVariable.of(this.n, (index) => new Set([index]));

    return Dataframe.of(cols);
  }
}
