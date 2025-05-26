import { createWithEqualityFn } from "zustand/traditional";
import { createStoreUtils } from "./utils";
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
    offsetX: number
    offsetY: number
    elements: Element[]
    selection: string[]
    cursor: string
}
const offsetX = mockElements.reduce((acc, cur) => {
    return Math.min(acc, cur.x)
}, Infinity)
const offsetY = mockElements.reduce((acc, cur) => {
    return Math.min(acc, cur.y)
}, Infinity)
export const _projectState = createWithEqualityFn<ProjectState>()(() => ({
    scale: 0.1,
    offsetX: offsetX - 1000,
    offsetY: offsetY - 1000,
    elements: mockElements,
    selection: [],
    cursor: ''
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