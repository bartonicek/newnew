import { createSignal } from "solid-js";
import { GROUP1 } from "../Marker";

export const makeSceneStore = () => {
  const [group, setGroup] = createSignal(GROUP1);
  const [selected, setSelected] = createSignal(new Set<number>());

  return {
    group,
    selected,
    setGroup,
    setSelected,
  };
};
