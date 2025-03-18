import Konva from "konva";
import React, { useEffect, useState } from "react";
import { Rect } from "react-konva";
import {
  convertToCenterRotation,
  createStoreUtils,
  extractRotationAngle,
} from "./utils";
import { Stage } from "konva/lib/Stage";
import { Transform, Util } from "konva/lib/Util";
import { createWithEqualityFn } from "zustand/traditional";

interface TransformBoxState {
  node: Node | null | undefined;
}

export const _transformState = createWithEqualityFn<TransformBoxState>()(
  () => ({
    node: null,
  })
);

export const {
  useStore: useTransformState,
  setState: setTransformState,
  getState: getTransformState,
} = createStoreUtils<TransformBoxState>(_transformState);

type TransformMatrix = {
  m00: number;
  m01: number;
  m02: number;
  m10: number;
  m11: number;
  m12: number;
};
type Node = {
  width: number;
  height: number;
  filpX?: boolean;
  filpY?: boolean;
  transform: TransformMatrix;
};
type TransformBoxProps = {
  onChangeNode?: (node: Node) => void;
  onChangeFilpX?: () => void;
  width?: number;
  height?: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
};
type AnchorData = {
  x: number;
  y: number;
  id: string;
  // 内部计算属性，不可被设置
  rotation?: number;
  offset?: {
    x: number;
    y: number;
  };
};
const ANGLES = {
  "__transform-left-top": -45,
  "__transform-right-top": 45,
  "__transform-left-bottom": -135,
  "__transform-right-bottom": 135,
};
const ANGLES_CNETER = {
  "__transform-top-center": 0,
  "__transform-right-center": -90,
  "__transform-left-center": 90,
  "__transform-bottom-center": 180,
};
function getCursor(anchorName: string, rad: number, filp = false) {
  if (filp) {
    if ((ANGLES as any)[anchorName] !== undefined) {
      rad += Util.degToRad((ANGLES as any)[anchorName] + 90);
    } else if ((ANGLES_CNETER as any)[anchorName] !== undefined) {
      rad += Util.degToRad((ANGLES_CNETER as any)[anchorName] + 180);
    }
  } else {
    rad += Util.degToRad(
      (ANGLES as any)[anchorName] || (ANGLES_CNETER as any)[anchorName] || 0
    );
  }
  const angle = ((Util.radToDeg(rad) % 360) + 360) % 360;

  if (Util._inRange(angle, 315 + 22.5, 360) || Util._inRange(angle, 0, 22.5)) {
    // TOP
    return "ns-resize";
  } else if (Util._inRange(angle, 45 - 22.5, 45 + 22.5)) {
    // TOP - RIGHT
    return "nesw-resize";
  } else if (Util._inRange(angle, 90 - 22.5, 90 + 22.5)) {
    // RIGHT
    return "ew-resize";
  } else if (Util._inRange(angle, 135 - 22.5, 135 + 22.5)) {
    // BOTTOM - RIGHT
    return "nwse-resize";
  } else if (Util._inRange(angle, 180 - 22.5, 180 + 22.5)) {
    // BOTTOM
    return "ns-resize";
  } else if (Util._inRange(angle, 225 - 22.5, 225 + 22.5)) {
    // BOTTOM - LEFT
    return "nesw-resize";
  } else if (Util._inRange(angle, 270 - 22.5, 270 + 22.5)) {
    // RIGHT
    return "ew-resize";
  } else if (Util._inRange(angle, 315 - 22.5, 315 + 22.5)) {
    // BOTTOM - RIGHT
    return "nwse-resize";
  } else {
    // how can we can there?
    Util.error("Transformer has unknown angle for cursor detection: " + angle);
    return "pointer";
  }
}

const TransformBox: React.FC<TransformBoxProps> = (props) => {
  const {
    width = 8,
    height = 8,
    fill = "#fff",
    stroke = "#4A90E2",
    strokeWidth = 1,
    onChangeNode,
  } = props;
  const node = useTransformState("node");
  const [anchorData, setAnchorData] = useState<AnchorData[]>([]);

  const updateAnchor = (node?: Node | null) => {
    if (!node) {
      setAnchorData([]);
      return;
    }
    const { transform, width: w, height: h } = node;

    // 定义元素的八个顶点 + 边框（变换前的坐标）
    const points = [
      { x: w / 2, y: h / 2, id: "__transform-border" }, // 边框
      { x: 0, y: 0, id: "__transform-left-top" }, // 左上角
      { x: w, y: 0, id: "__transform-right-top" }, // 右上角
      { x: w, y: h, id: "__transform-right-bottom" }, // 右下角
      { x: 0, y: h, id: "__transform-left-bottom" }, // 左下角
      { x: 0, y: h / 2, id: "__transform-left-center" }, // 左中间
      { x: w / 2, y: 0, id: "__transform-top-center" }, // 上中间
      { x: w / 2, y: h, id: "__transform-bottom-center" }, // 下中间
      { x: w, y: h / 2, id: "__transform-right-center" }, // 右中间
    ];
    const newData = points.map((point, i) => {
      const data = {
        ...point,
        x: transform.m00 * point.x + transform.m01 * point.y + transform.m02,
        y: transform.m10 * point.x + transform.m11 * point.y + transform.m12,
      };

      let convertData;
      if (i === 0) {
        convertData = convertToCenterRotation(
          data.x - w / 2,
          data.y - h / 2,
          w,
          h,
          extractRotationAngle(transform)
        );
      } else {
        convertData = convertToCenterRotation(
          data.x - width / 2,
          data.y - height / 2,
          width,
          height,
          extractRotationAngle(transform)
        );
      }

      return {
        ...data,
        ...convertData,
        offset: {
          x: convertData.offset.x,
          y: convertData.offset.y,
        },
      };
    });
    setAnchorData(newData);
  };

  useEffect(() => {
    updateAnchor(node);
  }, [
    node?.width,
    node?.height,
    node?.transform?.m00,
    node?.transform?.m01,
    node?.transform?.m02,
    node?.transform?.m10,
    node?.transform?.m11,
    node?.transform?.m12,
  ]);
  if (!node) return;

  const onDragMove = (ev: Konva.KonvaEventObject<DragEvent>) => {
    const rect = ev.target;
    const stage = rect.getStage() as Stage;
    if (!rect?.attrs?.id?.includes("__transform")) return;
    const changeData = {
      width: 0,
      height: 0,
      filpX: false,
      filpY: false,
    };
    if (rect.attrs.id === "__transform-right-center") {
      const leftNode = stage.findOne("#__transform-left-center")!;
      const width = stage.getPointerPosition()!.x - leftNode.x();
      changeData.width = Math.abs(width);
      changeData.filpX = width < 0;
      onChangeNode?.({
        ...node,
        width: changeData.width,
        filpX: changeData.filpX,
      });
    } else if (rect.attrs.id === "__transform-left-center") {
      const rightNode = stage.findOne("#__transform-right-center")!;
      const width =
        rightNode.getAbsolutePosition().x - stage.getPointerPosition()!.x;
      changeData.width = Math.abs(width);
      changeData.filpX = width < 0;
      onChangeNode?.({
        ...node,
        transform: {
          ...node.transform,
          m02: stage.getPointerPosition()!.x,
        },
        width: changeData.width,
        filpX: changeData.filpX,
      });
    } else if (rect.attrs.id === "__transform-top-center") {
      const bottomNode = stage.findOne("#__transform-bottom-center")!;
      const height =
        bottomNode.getAbsolutePosition().y - stage.getPointerPosition()!.y;
      changeData.height = Math.abs(height);
      changeData.filpY = height < 0;
      onChangeNode?.({
        ...node,
        transform: {
          ...node.transform,
          m12: stage.getPointerPosition()!.y,
        },
        height: changeData.height,
        filpY: changeData.filpY,
      });
    } else if (rect.attrs.id === "__transform-bottom-center") {
      const topNode = stage.findOne("#__transform-top-center")!;
      const diff = rect.y() - topNode.y();
      changeData.height = Math.abs(diff);
      changeData.filpY = diff < 0;
      onChangeNode?.({
        ...node,
        height: changeData.height,
        filpY: changeData.filpY,
      });
    } else if (rect.attrs.id === "__transform-right-bottom") {
      const topNode = stage.findOne("#__transform-left-top")!;
      const diffX = rect.x() - topNode.x();
      const diffY = rect.y() - topNode.y();
      changeData.width = Math.abs(diffX);
      changeData.height = Math.abs(diffY);
      changeData.filpX = diffX < 0;
      changeData.filpY = diffY < 0;
      onChangeNode?.({
        ...node,
        width: changeData.width,
        height: changeData.height,
        filpX: changeData.filpX,
        filpY: changeData.filpY,
      });
    } else if (rect.attrs.id === "__transform-left-top") {
      const bottomNode = stage.findOne("#__transform-right-bottom")!;
      const diffX =
        bottomNode.getAbsolutePosition().x - stage.getPointerPosition()!.x;
      const diffY =
        bottomNode.getAbsolutePosition().y - stage.getPointerPosition()!.y;
      changeData.width = Math.abs(diffX);
      changeData.height = Math.abs(diffY);
      changeData.filpX = diffX < 0;
      changeData.filpY = diffY < 0;
      onChangeNode?.({
        ...node,
        transform: {
          ...node.transform,
          m02: stage.getPointerPosition()!.x,
          m12: stage.getPointerPosition()!.y,
        },
        width: changeData.width,
        height: changeData.height,
        filpX: changeData.filpX,
        filpY: changeData.filpY,
      });
    } else if (rect.attrs.id === "__transform-right-top") {
      const leftNode = stage.findOne("#__transform-left-bottom")!;
      const diffX = rect.x() - leftNode.x();
      const diffY =
        leftNode.getAbsolutePosition().y - stage.getPointerPosition()!.y;
      changeData.width = Math.abs(diffX);
      changeData.height = Math.abs(diffY);
      changeData.filpX = diffX < 0;
      changeData.filpY = diffY < 0;
      onChangeNode?.({
        ...node,
        transform: {
          ...node.transform,
          m12: stage.getPointerPosition()!.y,
        },
        width: changeData.width,
        height: changeData.height,
        filpX: changeData.filpX,
        filpY: changeData.filpY,
      });
    } else if (rect.attrs.id === "__transform-left-bottom") {
      const rightNode = stage.findOne("#__transform-right-top")!;
      const diffX =
        rightNode.getAbsolutePosition().x - stage.getPointerPosition()!.x;
      const diffY = rect.y() - rightNode.y();
      changeData.width = Math.abs(diffX);
      changeData.height = Math.abs(diffY);
      changeData.filpX = diffX < 0;
      changeData.filpY = diffY < 0;
      onChangeNode?.({
        ...node,
        transform: {
          ...node.transform,
          m02: stage.getPointerPosition()!.x,
        },
        width: changeData.width,
        height: changeData.height,
        filpX: changeData.filpX,
        filpY: changeData.filpY,
      });
    }
  };
  const onMouseEnter = (ev: Konva.KonvaEventObject<MouseEvent>) => {
    const anchor = ev.target;
    let rad = Konva.getAngle(anchor.rotation());
    const { m00, m01, m02, m10, m11, m12 } = node.transform;
    const tr = new Transform([m00, m01, m10, m11, m02, m12]);
    const attrs = tr.decompose();
    let { scaleX, scaleY, rotation } = attrs;
    if (rotation !== 0) {
      scaleX *= -1;
      scaleY *= -1;
    }
    const isFilp =
      (scaleX === -1 && scaleY === 1) || (scaleY === -1 && scaleX === 1);
    const cursor = getCursor(anchor.attrs.id, rad, isFilp);
    anchor.getStage()!.content &&
      (anchor.getStage()!.content.style.cursor = cursor);
  };
  const onMouseOut = (ev: Konva.KonvaEventObject<MouseEvent>) => {
    const anchor = ev.target;
    anchor.getStage()!.content &&
      (anchor.getStage()!.content.style.cursor = "");
  };

  function dragBoundFunc(this: any, pos: any) {
    // 左、右中间锚点限定只能x拖拽
    if (
      ["__transform-left-center", "__transform-right-center"].includes(
        this.attrs.id
      )
    ) {
      return {
        x: pos.x,
        y: this.y(),
      };
    }
    // 上、下中间锚点限定只能y拖拽
    if (
      ["__transform-top-center", "__transform-bottom-center"].includes(
        this.attrs.id
      )
    ) {
      return {
        x: this.x(),
        y: pos.y,
      };
    }
    return pos;
  }

  return (
    <>
      {anchorData?.map?.((data, i) => {
        if (i === 0) {
          return (
            <Rect
              key={data.id}
              listening={false}
              x={data.x}
              y={data.y}
              width={node.width}
              height={node.height}
              offset={data.offset}
              rotation={data.rotation}
              stroke={stroke}
              strokeWidth={1}
            />
          );
        }
        return (
          <Rect
            draggable
            key={data.id}
            id={data.id}
            x={data.x}
            y={data.y}
            width={width}
            height={height}
            rotation={data.rotation}
            offset={data.offset}
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeWidth}
            onDragMove={onDragMove}
            dragBoundFunc={dragBoundFunc}
            onMouseEnter={onMouseEnter}
            onMouseOut={onMouseOut}
          />
        );
      })}
    </>
  );
};

export default TransformBox;
