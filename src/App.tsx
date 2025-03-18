import { Layer, Rect, Stage } from "react-konva";
import "./App.css";
import Frame from "./Frame";
import { DataStore } from "./store";
import Konva from "konva";
import { useCallback, useEffect, useRef } from "react";
import { RectConfig } from "konva/lib/shapes/Rect";
import TransformBox, { setTransformState } from "./TransformBox";
import { Transform } from "konva/lib/Util";

function App() {
  return <DrawElement />;
}

const DrawElement = () => {
  const stageRef = useRef<Konva.Stage>(null);
  const selectNodeRef = useRef<any>(null);
  const setNode = (node: any) => {
    setTransformState({ node });
  };
  const transformNodeData = () => {
    const rect = selectNodeRef.current;
    if (!rect) return null;
    const matrix = rect?.getAbsoluteTransform(rect.getStage())?.m;
    if (!matrix) return null;
    
    return {
      width: rect.width(),
      height: rect.height(),
      transform: {
        m00: matrix[0],
        m01: matrix[1],
        m02: matrix[4],
        m10: matrix[2],
        m11: matrix[3],
        m12: matrix[5],
      },
    };
  };

  const render = useCallback((nodes: RectConfig[]) => {
    return nodes.map((node) => {
      if (node.type === "rect") {
        return <Rect key={node.id} {...node} />;
      }
      if (node.type === "frame") {
        return (
          <Frame key={node.id} {...node}>
            {render(node.children)}
          </Frame>
        );
      }
    });
  }, []);

  useEffect(() => {
    setNode(transformNodeData());
  }, []);

  const setSelectNodeRef = (node: any) => {
    if (node?.nodeType === "Group") {
      if (node?.children?.[0]?.attrs?.name !== "Frame") {
        selectNodeRef.current = null;
        return;
      }
      selectNodeRef.current = node?.children?.[0]?.children?.[0];
      return;
    }
    selectNodeRef.current = node;
  };
  const setSelectNode = (e: any) => {
    if (e.target?.attrs?.id?.includes?.("__transform")) {
      return;
    }
    setSelectNodeRef(e.target);
    if (e.target.nodeType === "Stage") {
      setNode(null);
      return;
    }
    setNode(transformNodeData());
  };

  return (
    <Stage
      width={window.innerWidth}
      height={window.innerHeight}
      ref={stageRef}
      onClick={(e) => {
        setSelectNode(e);
      }}
      onDragStart={(e) => {
        if (e.target?.attrs?.id?.includes("__transform")) {
          return;
        }
        setNode(null);
      }}
      onDragEnd={(e) => {
        setSelectNode(e);
      }}
    >
      <Layer>
        {render(DataStore.data)}
        <TransformBox
          onChangeNode={(node) => {
            const rect = selectNodeRef.current as any;
            if (!rect) return;
            if (rect.attrs.type === "Frame") {
              const frame = rect.parent;
              const frameGroup = frame.parent;
              rect?.setSize({
                width: node.width,
                height: node.height,
              });
              frame.setClip({
                width: node.width,
                height: node.height,
              });
              const { m00, m01, m02, m10, m11, m12 } = node.transform;
              const tr = new Transform([m00, m01, m10, m11, m02, m12]);
              const attrs = tr.decompose();
              frameGroup?.setX(attrs.x);
              frameGroup?.setY(attrs.y);
              // frameGroup.clearCache();
              // frame.clearCache();
              // rect.clearCache();
              if (node.filpX !== undefined) {
                node.filpX ? frameGroup?.scaleX(-1) : frameGroup?.scaleX(1);
              }
              if (node.filpY !== undefined) {
                node.filpY ? frameGroup?.scaleY(-1) : frameGroup?.scaleY(1);
              }
              setNode(transformNodeData());
              return;
            }
            rect?.setSize({
              width: node.width,
              height: node.height,
            });
            const { m00, m01, m02, m10, m11, m12 } = node.transform;
            const tr = new Transform([m00, m01, m10, m11, m02, m12]);
            const attrs = tr.decompose();
            const rectPos = rect.parent
              .getAbsoluteTransform()
              .copy()
              .invert()
              .point({ x: attrs.x, y: attrs.y });

            rect?.setX(rectPos.x);
            rect?.setY(rectPos.y);
            if (node.filpX !== undefined) {
              node.filpX ? rect?.scaleX(-1) : rect?.scaleX(1);
            }
            if (node.filpY !== undefined) {
              node.filpY ? rect?.scaleY(-1) : rect?.scaleY(1);
            }
            setNode(transformNodeData());
          }}
        />
      </Layer>
    </Stage>
  );
};

export default App;
