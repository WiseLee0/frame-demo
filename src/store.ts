import { Shape } from "konva/lib/Shape";
import { RectConfig } from "konva/lib/shapes/Rect";
class DataStoreInstance {
  data: RectConfig[] = [];
  count = 0;
  constructor() {
    const rects = [
      {
        type: "rect",
        id: "rect1",
        x: 120,
        y: 60,
        width: 60,
        height: 60,
        fill: "#FF6B6B",
        draggable: true,
      },
    ] as RectConfig[];
    const frame = {
      type: "frame",
      id: "frame1",
      x: 320,
      y: 120,
      width: 300,
      height: 300,
      fill: "#F0F4FF",
      stroke: "#4A90E2",
      children: [
        {
          type: "rect",
          id: "rect2",
          x: 20,
          y: 20,
          width: 60,
          height: 60,
          fill: "#FF6BCC",
          draggable: true,
        },
      ],
    };
    this.data = [rects[0], frame];
  }
}

export const DataStore = new DataStoreInstance();

class GlobalStoreInstance {
  selectNode?: Shape | null;
}

export const GlobalStore = new GlobalStoreInstance();
