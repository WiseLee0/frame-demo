import Konva from "konva";
import { selectionBoxConfig, SelectionBoxConfig } from "..";
import { createWithEqualityFn } from "zustand/traditional";
import { createStoreUtils } from "../../util";

interface Node {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  selection: string[];
  frames: any;
}

interface SelectionBoxState {
  konvaGroupRef: React.RefObject<Konva.Group> | null; // konvaGroup节点
  renderDep: boolean;  // 渲染依赖
  nodes: Node[];       // 渲染外框数据
  innerNodes: Node[];  // 渲染内框数据
  config: SelectionBoxConfig[];    // 元素选框，配置文件
  isDragging: boolean; // 是否拖拽中
  dragNodeId: string;  // 拖拽的节点id
}
export const _selectionBoxState = createWithEqualityFn<SelectionBoxState>()(() => ({
  konvaGroupRef: null,
  renderDep: false,
  nodes: [],
  innerNodes: [],
  config: selectionBoxConfig,
  isDragging: false,
  dragNodeId: '',
}));

export const clearSelectionNodes = () => {
  setSelectionBoxState({
    nodes: [],
    innerNodes: [],
  });
};

export const changeSelectionRender = () => {
  setSelectionBoxState({
    renderDep: !getSelectionBoxState('renderDep'),
  });
};

export const {
  useStore: useSelectionBoxState,
  setState: setSelectionBoxState,
  getState: getSelectionBoxState,
} = createStoreUtils<SelectionBoxState>(_selectionBoxState);