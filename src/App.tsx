import { Layer, Rect, Stage } from "react-konva";
import "./App.css";
import Frame from "./Frame";
import { DataStore, GlobalStore } from "./store";
import Konva from "konva";
import { useEffect, useRef } from "react";
import { Group } from "konva/lib/Group";
import { RectConfig } from "konva/lib/shapes/Rect";
import { Shape } from "konva/lib/Shape";

function App() {
  const stageRef = useRef<Konva.Stage>(null);

  const handlePointDown = () => {
    const stage = stageRef.current;
    const pointerPosition = stage?.getPointerPosition();
    // 记录选择元素
    if (pointerPosition && stage) {
      const node = stage.getIntersection(pointerPosition);
      GlobalStore.selectNode = node;
    }
  };

  // 选择元素是否为Frame
  const selectNodeIsFrame = () => {
    const { selectNode } = GlobalStore;
    return selectNode?.parent?.attrs?.name === "Frame";
  };

  // 获取移入的FrameNode
  const getIntersectionFrame = () => {
    const { selectNode } = GlobalStore;
    const stage = stageRef.current;
    if (!selectNode || !stage) return;
    const frames = stage.find(".Frame") as Group[];
    let maxDepth = -1;
    let frameNode: Group | null = null;
    const pointerPosition = stage?.getPointerPosition();

    frames.map((frame) => {
      const frameRect = frame.children[0] as Shape;
      const frameChildren = frame.children[1] as Group;
      // 排除当前选择的Frame
      if (frameRect.id() === selectNode.id()) {
        return;
      }

      // 相交情况下，选择层级最高的Frame
      const zIndex = frameRect.getAbsoluteZIndex();
      if (zIndex >= maxDepth && frameRect.intersects(pointerPosition)) {
        maxDepth = zIndex;
        frameNode = frameChildren!;
      }
    });
    return frameNode as unknown as Group;
  };

  // 处理移动画板逻辑
  const handleMoveFrame = () => {
    let selectNode = GlobalStore.selectNode;
    const stage = stageRef.current;
    if (!selectNode || !stage) return;
    const frameNode = getIntersectionFrame();

    if (selectNodeIsFrame()) {
      selectNode = selectNode.parent as unknown as Shape;
    }

    // 移出画板则拖拽到最高层级
    if (!frameNode) {
      const layer = stage.children[0];
      if (layer && selectNode.parent !== layer) {
        selectNode.moveTo(layer);
      }
      return;
    }

    if (selectNode.parent !== frameNode) {
      selectNode.moveTo(frameNode);
    }
  };

  const handlePointMove = () => {
    handleMoveFrame();
  };

  const handlePointUp = () => {
    GlobalStore.selectNode = null;
  };

  useEffect(() => {
    window.addEventListener("pointerdown", handlePointDown);
    window.addEventListener("pointermove", handlePointMove);
    window.addEventListener("pointerup", handlePointUp);

    return () => {
      window.removeEventListener("pointerdown", handlePointDown);
      window.removeEventListener("pointermove", handlePointMove);
      window.removeEventListener("pointerup", handlePointUp);
    };
  }, []);

  return (
    <div>
      <Stage
        width={window.innerWidth}
        height={window.innerHeight}
        ref={stageRef}
      >
        <DrawElement />
      </Stage>
    </div>
  );
}

const DrawElement = () => {
  const render = (nodes: RectConfig[]) => {
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
  };

  return <Layer>{render(DataStore.data)}</Layer>;
};

export default App;
