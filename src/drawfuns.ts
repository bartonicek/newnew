const defaultRepOptions = { color: "black", stroke: undefined, alpha: 1 };
type DefaultRepOptions = typeof defaultRepOptions;

export function drawClear(context: CanvasRenderingContext2D) {
  const { width, height } = context.canvas.getBoundingClientRect();
  context.clearRect(0, 0, width, height);
}

export function drawRect(
  context: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  options?: { color?: string; alpha?: number; stroke?: string }
) {
  const [w, h] = [x1 - x0, y1 - y0];
  const { height } = context.canvas.getBoundingClientRect();
  const opts = { ...{ color: "black", alpha: 1 }, ...options };

  context.save();
  context.fillStyle = opts.color;
  context.globalAlpha = opts.alpha;
  context.fillRect(x0, height - y0, w, -h);
  if (options?.stroke) {
    context.strokeStyle = options.stroke;
    context.strokeRect(x0, height - y0, w, -h);
  }
  context.restore();
}

export function drawPoint(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  options?: { color?: string; alpha?: number; stroke?: string; radius?: number }
) {
  const opts = { ...{ color: "black", alpha: 1, radius: 5 }, ...options };

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

export type LineOptions = {
  color?: string;
  width?: number;
};

export function drawLine(
  context: CanvasRenderingContext2D,
  x: number[],
  y: number[],
  options?: { color?: string; width?: number }
) {
  const opts = { ...{ color: "black", alpha: 1, width: 1 }, ...options };

  context.save();

  context.strokeStyle = opts.color;
  context.lineWidth = opts.width;

  context.beginPath();
  context.moveTo(x[0], y[0]);
  for (let i = 1; i < x.length; i++) context.lineTo(x[i], y[i]);
  context.stroke();
  context.restore();
}

export function drawText(
  context: CanvasRenderingContext2D,
  label: string,
  x: number,
  y: number,
  options?: { fontsize?: number; fontfamily?: string; vertical?: boolean }
) {
  const opts = { ...{ fontsize: 10, fontfamily: `Arial` }, ...options };

  context.save();
  context.translate(x, y);
  if (options?.vertical) context.rotate(-Math.PI / 2);
  context.font = `${opts?.fontsize}px ${opts.fontfamily}`;
  context.fillText(label, 0, 0);
  context.translate(-x, -y);
  context.restore();
}
