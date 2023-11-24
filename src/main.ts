import { Dataframe } from "./Dataframe";
import { from, product } from "./Factor";
import { fetchJSON } from "./funs";
import "./style.css";

const mpgJSON = await fetchJSON("./data/mpg.json");

let data = Dataframe.parseColumns(mpgJSON, {
  hwy: "numeric",
  displ: "numeric",
  cyl: "discrete",
  manufacturer: "discrete",
});

const zero = () => 0;
const one = () => 1;
const empty = () => "";
function add(x: number, y: number) {
  return x + y;
}

function longest(x: string, y: string) {
  return y.length > x.length ? y : x;
}

const f1 = () => from(data.col("cyl").array);
const f2 = () => from(data.col("manufacturer").array);
const f3 = () => product(f1(), f2());

console.log(data.col("cyl").values());

const data2 = data
  .summarize("cyl", "stat1", empty, longest)
  .summarize("hwy", "stat2", zero, add);

const data3 = data2.partitionBy(f3);

const partitions = data2.makePartitions([f1, f2, f3] as const);

const p = partitions[2]();

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
