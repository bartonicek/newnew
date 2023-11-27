import { Scene } from "./dom/Scene";
import { add, fetchJSON, zero } from "./funs";
import { Dataframe } from "./structs/Dataframe";
import { mono } from "./structs/Factor";
import { NumericVariable, StringVariable } from "./structs/Variable";
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

const app = document.querySelector("#app") as HTMLDivElement;
const scene = Scene.of(app, data);

const data3 = data.select(({ model }) => ({ var1: model }));

const f0 = () => mono(data.n());
const f1 = () => f0().nest(data.col("cyl").asFactor());
const f2 = () => f1().nest(data.col("manufacturer").asFactor());

const data2 = data
  .mutate("aux1", ({ hwy, model }) => [hwy, model])
  .summarize(INDICATOR, "stat1", zero, add)
  .summarize("hwy", "stat2", zero, add)
  .summarize(
    "aux1",
    "stat3",
    () => [-Infinity, ""],
    (prev, next) => {
      if (prev[0] > next[0]) return prev;
      return next;
    },
    ([_, model]) => model
  );

const partitions = data2.makePartitions([f0, f1, f2] as const);
const p = partitions[1]();

console.log(p.rows());
p.col("stat1").stack();
console.log(p.rows());

function Barplot<T extends Variables>(
  scene: Scene<T>,
  selectfn: (vars: T) => { var1: StringVariable }
) {
  const data = scene
    .data()
    .select(selectfn)
    .summarize(INDICATOR, "stat1", zero, add);

  const factor1 = () => data.col("var1").asFactor();

  const partitions = data.makePartitions([factor1]);

  const drawData = () => {
    const partitionData = partitions[0]();
    partitionData.col("label").mapTo("x");
    partitionData.col("stat1").stack().mapTo("y");
  };

  const borderData = () => {
    const partitionData = partitions[0]();
    partitionData.col("label").mapTo("x");
    partitionData.col("stat1").mapTo("y");
  };

  const plot = scene.createPlot();

  return plot;
}

const barplot1 = Barplot(scene, (d) => ({ var1: d.cyl }));
const barplot2 = Barplot(scene, (d) => ({ var1: d.cyl }));
const barplot3 = Barplot(scene, (d) => ({ var1: d.cyl }));

const a = Dataframe.of({
  x: NumericVariable.of([1, 2, 3]),
  y: NumericVariable.of([2, 3, 4]),
});

let row = a.row(0);
row = a.row(1, row);

console.log(row);

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
