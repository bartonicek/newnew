function from(array: string[], labels?: string[]) {
  if (!labels) labels = meta.values.sort(compareAlNum);

  const uniqueIndices = new Set(seq(0, labels.length));
  const indices = [] as number[];
  const positions = {} as Record<number, Set<number>>;

  for (let i = 0; i < array.length; i++) {
    const index = labels.indexOf(array[i].toString());
    if (!positions[index]) positions[index] = new Set();
    positions[index].add(i);
    indices.push(index);
  }

  const data = new Dataframe(labels.length, {
    label: StrVariable.from(labels, { name: strVariable.name }),
    [positionsSymbol]: RefVariable.from(Object.values(positions)),
  });

  return new Computed(uniqueIndices, indices, data);
}
