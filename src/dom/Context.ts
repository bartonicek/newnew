import { Accessor, createEffect } from "solid-js";
import html from "solid-js/html";

export class Context {
  private canvas: HTMLCanvasElement;
  private context: CanvasRenderingContext2D;

  constructor(
    private width: Accessor<number>,
    private height: Accessor<number>
  ) {
    this.canvas = html`<canvas />` as HTMLCanvasElement;
    this.context = this.canvas.getContext("2d")!;
    const scalingFactor = 3;

    createEffect(() => {
      const [w, h] = [width(), height()];
      this.canvas.style.width = w + `px`;
      this.canvas.style.height = h + `px`;
      this.canvas.width = Math.ceil(w * scalingFactor);
      this.canvas.height = Math.ceil(h * scalingFactor);
      this.context.scale(scalingFactor, scalingFactor);
    });
  }

  static of(width: Accessor<number>, height: Accessor<number>) {
    return new Context(width, height);
  }

  appendTo(parent: HTMLDivElement) {
    parent.appendChild(this.canvas);
    return this;
  }

  addClass(name: string) {
    this.canvas.classList.add(name);
    return this;
  }

  setStyle(property: keyof CSSStyleDeclaration, value: string) {
    this.canvas.style[property as any] = value;
    return this;
  }

  drawRect(
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    options?: { color?: string; alpha?: number; stroke?: string }
  ) {
    const opts = { ...{ color: "black", alpha: 1 }, ...options };

    const { context } = this;
    const width = this.width();
    const height = this.height();

    const [w, h] = [(x1 - x0) * width, (y1 - y0) * height];

    context.save();
    context.fillStyle = opts.color;
    context.globalAlpha = opts.alpha;

    context.fillRect(x0, height - y0, w, -h);
    if (opts?.stroke) {
      context.strokeStyle = opts.stroke;
      context.strokeRect(x0, height - y0, w, -h);
    }

    context.restore();
  }

  drawPoint(
    x: number,
    y: number,
    options?: {
      color?: string;
      alpha?: number;
      stroke?: string;
      radius?: number;
    }
  ) {
    const opts = { ...{ color: "black", alpha: 1, radius: 5 }, ...options };

    const { context } = this;
    const width = this.width();
    const height = this.height();

    x = x * width;
    y = height - y * height;

    context.save();
    context.fillStyle = opts.color;
    context.globalAlpha = opts.alpha;

    context.beginPath();
    context.arc(x, y, opts.radius, 0, 2 * Math.PI, false);
    context.fill();
    if (opts.stroke) {
      context.strokeStyle = opts.stroke;
      context.stroke();
    }

    context.restore();
  }
}
