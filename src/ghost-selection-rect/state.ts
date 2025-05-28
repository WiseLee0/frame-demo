import { createWithEqualityFn } from "zustand/traditional";
import { createStoreUtils } from "../util";

interface Node {
    x: number;
    y: number;
    width: number;
    height: number;
}

interface GhostSelectionRectState {
    node: Node | null;       // 渲染框数据
}
export const _ghostSelectionRectState = createWithEqualityFn<GhostSelectionRectState>()(() => ({
    node: null,
}));

export const {
    useStore: useGhostSelectionRectState,
    setState: setGhostSelectionRectState,
    getState: getGhostSelectionRectState,
} = createStoreUtils<GhostSelectionRectState>(_ghostSelectionRectState);