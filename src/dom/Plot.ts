import { asInt } from "@abartonicek/utilities";
import html from "solid-js/html";
import { Context } from "./Context";
import { Scene } from "./Scene";
import { makePlotStore } from "./makePlotStore";

export const groupContexts = [1, 2, 3, 4, 5, 6, 7, 8] as const;
export const contexts = ["base", "user", "over", ...groupContexts] as const;
export type ContextName = (typeof contexts)[number];

export class Plot {
  id: Symbol;
  store: ReturnType<typeof makePlotStore>;
  container: HTMLDivElement;
  contexts: Record<ContextName, Context>;

  constructor(private scene: Scene<any>) {
    this.id = Symbol();
    this.container = html`<div />` as HTMLDivElement;
    this.container.classList.add("plotscape-plot");
    scene.container.appendChild(this.container);

    this.store = makePlotStore();

    this.contexts = {} as Record<ContextName, Context>;
    for (const k of contexts) this.contexts[k] = makeContext(this, k);

    this.container.addEventListener("click", this.onClick);
    this.container.addEventListener("dblclick", this.onDblclick);
    window.addEventListener("resize", this.onResize);
  }

  static of(scene: Scene<any>) {
    return new Plot(scene);
  }

  activate = () => {
    this.store.setActive(true);
    this.container.classList.add("active");
  };

  deactivate = () => {
    this.store.setActive(false);
    this.container.classList.remove("active");
  };

  onResize = () => {
    const { setWidth, setHeight } = this.store;
    setWidth(asInt(getComputedStyle(this.container).width));
    setHeight(asInt(getComputedStyle(this.container).height));
  };

  onClick = (event: MouseEvent) => {
    this.activate();
  };

  onDblclick = (event: MouseEvent) => {
    this.deactivate();
  };
}

function makeContext(plot: Plot, contextName: ContextName) {
  const { store, container } = plot;
  const inner = contextName !== "over";
  const width = inner ? store.innerWidth : store.width;
  const height = inner ? store.innerHeight : store.height;

  const context = Context.of(width, height)
    .appendTo(container)
    .addClass(`plotscape-${contextName}`);

  if (inner) {
    context.setStyle("marginLeft", store.marginLeft() + `px`);
    context.setStyle("marginTop", store.marginTop() + `px`);
  }

  return context;
}
