import { Lazy } from "@abartonicek/utilities";
import { Dataframe } from "./structs/Dataframe";
import { Variables } from "./types";

export class Representer<T extends Variables, U extends Variables> {
  constructor(
    private drawData: Lazy<Dataframe<T, any>>,
    private boundaryData: Lazy<Dataframe<U, any>>,
    private representation: any
  ) {}

  static of<T extends Variables, U extends Variables>(
    drawData: () => Dataframe<T, any>,
    boundaryData: () => Dataframe<U, any>,
    representation: any
  ) {
    return new Representer(drawData, boundaryData, representation);
  }

  draw() {
    const data = this.drawData();
  }

  checkSelection() {
    const data = this.boundaryData();
  }
}
