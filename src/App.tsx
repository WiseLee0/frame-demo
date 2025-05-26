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
  const offsetX = useProjectState('offsetX')
  const offsetY = useProjectState('offsetY')
  const cursor = useProjectState('cursor')
  useEffect(() => {
    const stage = stageRef.current!;
    sharedStageRef.current = stage as any;
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()
      const offsetX = getProjectState('offsetX')
      const offsetY = getProjectState('offsetY')
      const scale = getProjectState('scale')

      if (e.ctrlKey) {
        const newScale = e.deltaY > 0 ? scale * 0.95 : scale * 1.05;
        setProjectState({ scale: newScale });
        return;
      }
      // 普通滚动时平移画布
      setProjectState({
        offsetX: offsetX + e.deltaX / scale,
        offsetY: offsetY + e.deltaY / scale
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
    <Stage width={window.innerWidth} height={window.innerHeight - 50} ref={stageRef} scaleX={scale} scaleY={scale} offsetX={offsetX} offsetY={offsetY} className={cursor}>
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
