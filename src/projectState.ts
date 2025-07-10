import { createWithEqualityFn } from "zustand/traditional";
import { createStoreUtils } from "./util";
import { mockElements } from "./mock";

interface Element {
    id: string
    x: number
    y: number
    width: number
    height: number
    rotation: number
    [key: string]: any
}
interface ProjectState {
    scale: number
    x: number
    y: number
    elements: Element[]
    selection: string[]
}
const startX = mockElements.reduce((acc, cur) => {
    return Math.min(acc, cur.x)
}, Infinity)
const startY = mockElements.reduce((acc, cur) => {
    return Math.min(acc, cur.y)
}, Infinity)
export const _projectState = createWithEqualityFn<ProjectState>()(() => ({
    scale: 0.1,
    x: (startX - 1000) * 0.1,
    y: (startY - 1000) * 0.1,
    elements: mockElements,
    selection: [],
}));

export const {
    useStore: useProjectState,
    setState: setProjectState,
    getState: getProjectState,
} = createStoreUtils<ProjectState>(_projectState);

// DEBUG模式
// export const setProjectState = (state: Partial<ProjectState>) => {
//     _setProjectState(state)
// }