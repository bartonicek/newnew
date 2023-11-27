import { asInt } from "@abartonicek/utilities";
import { createEffect } from "solid-js";
import html from "solid-js/html";
import { Scene } from "./Scene";
import { makePlotStore } from "./makePlotStore";

export const groupContexts = [1, 2, 3, 4, 5, 6, 7, 8] as const;
export const contexts = ["base", "user", "over", ...groupContexts] as const;

export type Context = (typeof contexts)[number];
export type Contexts = Record<Context, CanvasRenderingContext2D>;

export class Plot {
  id: Symbol;
  store: ReturnType<typeof makePlotStore>;
  container: HTMLDivElement;
  contexts: Contexts;

  constructor(private scene: Scene<any>) {
    this.id = Symbol();
    this.container = html`<div />` as HTMLDivElement;
    this.container.classList.add("plotscape-plot");
    scene.container.appendChild(this.container);

    this.store = makePlotStore();

    this.contexts = {} as Contexts;
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
    console.log("resize");
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

function makeContext(plot: Plot, contextName: Context) {
  const canvas = html`<canvas />` as HTMLCanvasElement;
  canvas.classList.add(`plotscape-${contextName}`);
  plot.container.appendChild(canvas);
  const inner = contextName !== "over";

  if (inner) {
    canvas.style.marginLeft = plot.store.marginLeft() + "px";
    canvas.style.marginTop = plot.store.marginTop() + "px";
  }

  const context = canvas.getContext("2d")!;

  const width = inner ? plot.store.innerWidth : plot.store.width;
  const height = inner ? plot.store.innerHeight : plot.store.height;
  const scalingFactor = 3;

  createEffect(() => {
    const [w, h] = [width(), height()];
    canvas.style.width = w + `px`;
    canvas.style.height = h + `px`;
    canvas.width = Math.ceil(w * scalingFactor);
    canvas.height = Math.ceil(h * scalingFactor);
    context.scale(scalingFactor, scalingFactor);
  });

  return context;
}
