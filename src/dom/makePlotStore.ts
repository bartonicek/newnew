import { lazy } from "@abartonicek/utilities";
import { createSignal } from "solid-js";
import { graphicParameters } from "../graphicParameters";

export const makePlotStore = () => {
  const [active, setActive] = createSignal(false);

  const [width, setWidth] = createSignal(0);
  const [height, setHeight] = createSignal(0);

  const [rightButtonClicked, setRightButtonClicked] = createSignal(false);
  const [holding, setHolding] = createSignal(false);
  const [mouseX, setMouseX] = createSignal(0);
  const [mouseY, setMouseY] = createSignal(0);
  const [clickX, setClickX] = createSignal(0);
  const [clickY, setClickY] = createSignal(0);

  const { marginLines, fontsize } = graphicParameters;
  const marginBottom = lazy(marginLines[0] * fontsize);
  const marginLeft = lazy(marginLines[1] * fontsize);
  const marginTop = lazy(marginLines[2] * fontsize);
  const marginRight = lazy(marginLines[3] * fontsize);

  const innerClickX = () => {
    return clickX() - marginLeft();
  };

  const innerWidth = () => width() - marginLeft() - marginRight();
  const innerHeight = () => height() - marginBottom() - marginTop();
  const innerLeft = marginLeft;
  const innerRight = () => width() - marginRight();
  const innerBottom = marginBottom;
  const innerTop = () => height() - marginTop();

  const store = {
    active,
    width,
    height,
    rightButtonClicked,
    holding,
    mouseX,
    mouseY,
    clickX,
    clickY,
    innerWidth,
    innerHeight,
    innerLeft,
    innerRight,
    innerTop,
    innerBottom,
    marginBottom,
    marginLeft,
    marginTop,
    marginRight,
    innerClickX,
    setActive,
    setWidth,
    setHeight,
    setRightButtonClicked,
    setHolding,
    setMouseX,
    setMouseY,
    setClickX,
    setClickY,
  };

  return store;
};
