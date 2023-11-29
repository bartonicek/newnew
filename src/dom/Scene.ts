import { Marker } from "../Marker";
import { Dataframe } from "../structs/Dataframe";
import { Variables } from "../types";
import { Plot } from "./Plot";
import { makeSceneStore } from "./makeSceneStore";

export class Scene<T extends Variables> {
  private plots: Plot[];

  private nPlots: number;
  private nRows: number;
  private nCols: number;

  public store: ReturnType<typeof makeSceneStore>;
  public marker: Marker;

  constructor(
    public container: HTMLDivElement,
    private _data: Dataframe<T, {}>
  ) {
    this.container.classList.add("plotscape-scene");
    this.plots = [];

    this.nPlots = 0;
    this.nRows = 0;
    this.nCols = 0;

    this.store = makeSceneStore();
    this.marker = Marker.of(_data.n(), this.store.group, this.store.selected);
  }

  static of<T extends Variables>(
    container: HTMLDivElement,
    data: Dataframe<T, {}>
  ) {
    return new Scene(container, data);
  }

  data() {
    return this._data;
  }

  createPlot() {
    const plot = Plot.of(this);
    this.plots.push(plot);

    this.nPlots++;
    this.nCols = Math.ceil(Math.sqrt(this.nPlots));
    this.nRows = Math.ceil(this.nPlots / this.nCols);

    this.setRowsCols(this.nCols, this.nRows);

    return plot;
  }

  setRowsCols = (rows: number, cols: number) => {
    document.documentElement.style.setProperty("--ncols", cols.toString());
    document.documentElement.style.setProperty("--nrows", rows.toString());
    for (const plot of this.plots) plot.onResize();
  };
}
