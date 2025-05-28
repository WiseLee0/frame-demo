import { createWithEqualityFn } from "zustand/traditional";
import { createStoreUtils } from "../util";

interface HoverNode {
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;
    [key: string]: any;
}

interface HoverSelectionRectState {
    node: HoverNode | null;       // 渲染框数据
    hotId: string;              // 当前热区id
}
export const _hoverSelectionRectState = createWithEqualityFn<HoverSelectionRectState>()(() => ({
    node: null,
    hotId: '',
}));

export const {
    useStore: useHoverSelectionRectState,
    setState: setHoverSelectionRectState,
    getState: getHoverSelectionRectState,
} = createStoreUtils<HoverSelectionRectState>(_hoverSelectionRectState);