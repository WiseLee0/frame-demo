import { Layer, Stage } from "react-konva";
import "./App.css";
import { RenderElements } from "./render";
import { GhostSelectionRect, useGhostSelectionRectEvent } from "./ghost-selection-rect";
import { useEffect, useRef } from "react";
import Konva from "konva";
import { getProjectState, setProjectState, useProjectState } from "./projectState";
import { SelectionBoxRects, useSelectionBoxEvent } from "./selection-box";
import { HoverSelectionRect, useHoverSelectionRectEvent } from "./hover-selection-rect";

let sharedStageRef = { current: null };
export const getSharedStage = () => sharedStageRef.current as unknown as Konva.Stage;

function App() {
  const stageRef = useRef<Konva.Stage>(null)
  const scale = useProjectState('scale')
  const x = useProjectState('x')
  const y = useProjectState('y')
  useEffect(() => {
    const stage = stageRef.current!;
    sharedStageRef.current = stage as any;
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()
      const x = getProjectState('x')
      const y = getProjectState('y')
      const scale = getProjectState('scale')

      if (e.ctrlKey) {
        const stage = stageRef.current!;

        // 获取鼠标在stage容器中的原始位置
        const rect = stage.container().getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // 计算新的缩放比例
        const oldScale = scale;
        const newScale = e.deltaY > 0 ? scale * 0.95 : scale * 1.05;
        const scaleRatio = newScale / oldScale;

        const newX = (x + mouseX) * scaleRatio - mouseX;
        const newY = (y + mouseY) * scaleRatio - mouseY;

        setProjectState({
          scale: newScale,
          x: newX,
          y: newY
        });
        return;
      }
      // 普通滚动时平移画布
      const panSpeed = 0.7;
      setProjectState({
        x: x + e.deltaX * panSpeed,
        y: y + e.deltaY * panSpeed
      });
    }
    window.addEventListener('wheel', handleWheel, { passive: false })
    return () => {
      window.removeEventListener('wheel', handleWheel)
    }
  }, [])
  useHoverSelectionRectEvent()
  useSelectionBoxEvent()
  useGhostSelectionRectEvent()

  return <div>
    <div style={{ height: 50, width: '100%', backgroundColor: 'black' }}></div>
    <Stage width={window.innerWidth} height={window.innerHeight - 50} ref={stageRef} scaleX={scale} scaleY={scale} x={-x} y={-y} >
      <Layer >
        <RenderElements />
        <HoverSelectionRect />
        <SelectionBoxRects />
        <GhostSelectionRect />
      </Layer>
    </Stage>
  </div>;
}

export default App;
