import Konva from "konva";
import { SelectionBoxConfig } from "..";
import { createWithEqualityFn } from "zustand/traditional";
import { createStoreUtils } from "../../utils";

interface Node {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
}

interface SelectionBoxState {
  konvaGroupRef: React.RefObject<Konva.Group> | null; // konvaGroup节点
  renderDep: boolean;  // 渲染依赖
  nodes: Node[];       // 渲染外框数据
  innerNodes: Node[];  // 渲染内框数据
  config: SelectionBoxConfig[];    // 元素选框，配置文件
}
export const _selectionBoxState = createWithEqualityFn<SelectionBoxState>()(() => ({
  konvaGroupRef: null,
  renderDep: false,
  nodes: [],
  innerNodes: [],
  config: [],
}));

export const clearSelectionNodes = () => {
  setSelectionBoxState({
    nodes: [],
    innerNodes: [],
  });
};

export const {
  useStore: useSelectionBoxState,
  setState: setSelectionBoxState,
  getState: getSelectionBoxState,
} = createStoreUtils<SelectionBoxState>(_selectionBoxState);