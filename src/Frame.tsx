import Konva from "konva";
import { GroupConfig } from "konva/lib/Group";
import { RectConfig } from "konva/lib/shapes/Rect";
import React, { useRef } from "react";
import { Rect, Group } from "react-konva";

const Frame: React.FC<GroupConfig & RectConfig> = (props) => {
  const { x, y, width, height, children, fill, stroke } = props;
  const frameRef = useRef<Konva.Rect>(null);

  return (
    <Group
      draggable
      clipX={x}
      clipY={y}
      clipWidth={width}
      clipHeight={height}
      name={"Frame"}
    >
      <Rect
        ref={frameRef}
        x={x}
        y={y}
        width={width}
        height={height}
        fill={fill}
        stroke={stroke}
        id={props.id}
        type={"Frame"}
      />
      <Group x={x} y={y}>
        {children}
      </Group>
    </Group>
  );
};

export default Frame;
