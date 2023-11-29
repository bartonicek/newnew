import { createRoot } from "solid-js";
import { Representer } from "./Representer";
import { Scene } from "./dom/Scene";
import { add, fetchJSON, zero } from "./funs";
import { Dataframe } from "./structs/Dataframe";
import {
  ArrayVariable,
  ConstantVariable,
  NumericVariable,
  StringVariable,
} from "./structs/Variable";
import "./style.css";
import { INDICATOR } from "./symbols";
import { Variables } from "./types";

const mpgJSON = await fetchJSON("./data/mpg.json");

let data = Dataframe.parseColumns(mpgJSON, {
  hwy: "numeric",
  displ: "numeric",
  cyl: "discrete",
  manufacturer: "discrete",
  model: "discrete",
});

const data22 = data.select((d) => ({
  x: ConstantVariable.of([d.cyl, d.displ, d.hwy].map((x) => x.name())),
  y: ArrayVariable.of([d.cyl, d.displ, d.hwy] as const),
}));

function Barplot<T extends Variables>(
  scene: Scene<T>,
  selectfn: (vars: T) => { var1: StringVariable }
) {
  const data = scene
    .data()
    .select(selectfn)
    .summarize(INDICATOR, "stat1", zero, add);

  const factor1 = () => data.col("var1").asFactor();
  const factor2 = () => factor1().nest(scene.marker.asFactor());

  const ps = data.makePartitions([factor1, factor2] as const);

  const boundaryData = () => ps[0]().encode("label", "x").encode("stat1", "y");
  const drawData = () =>
    ps[1]().encode("label", "x").encode("stat1", "y").stack("stat1");

  const representer = Representer.of(drawData, boundaryData, 0 as any);

  const plot = scene.createPlot();

  return plot;
}

function Scatterplot<T extends Variables>(
  scene: Scene<T>,
  selectfn: (vars: T) => { var1: NumericVariable; var2: NumericVariable }
) {
  const { marker } = scene;
  const data = scene
    .data()
    .select(selectfn)
    .encode("var1", "x")
    .encode("var2", "y");

  const data2 = () => data.merge(marker.proxyData());
  const representer = Representer.of(data2, data2, {});

  const plot = scene.createPlot();

  return plot;
}

createRoot(() => {
  const app = document.querySelector("#app") as HTMLDivElement;
  const scene = Scene.of(app, data);

  const barplot1 = Barplot(scene, (d) => ({ var1: d.cyl }));
  const scatterplot1 = Scatterplot(scene, (d) => ({
    var1: d.hwy,
    var2: d.displ,
  }));
});

//   x: NumericVariable.of([1, 2, 3]),
//   y: NumericVariable.of([2, 3, 4]),
// });

// let row = a.row(0);
// row = a.row(1, row);

// console.log(row);

// const body = document.querySelector("body")!;

// const canvas = document.createElement("canvas");
// const v2 = ArrayVariable.of(data.cols("displ", "hwy", "manufacturer"));
// const context = canvas.getContext("2d")!;

// const width = 500;
// const height = 500;

// canvas.width = width;
// canvas.height = height;

// body.appendChild(canvas);

// context.save();
// context.fillStyle = "antiquewhite";
// context.fillRect(0, 0, width, height);
// context.restore();

// for (let i = 0; i < hwy.n(); i++) {
//   context.save();
//   context.strokeStyle = "lightgrey";
//   context.beginPath();

//   context.moveTo(exp.normalize(vars[0]) * width, data[vars[0]].pct(i) * height);
//   for (let j = 1; j < vars.length; j++) {
//     context.lineTo(
//       exp.normalize(vars[j]) * width,
//       data[vars[j]].pct(i) * height
//     );
//   }

//   context.stroke();
// }
