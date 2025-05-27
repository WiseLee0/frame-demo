type WH = [number, number]
export interface SelectionBoxConfig {
    type: string;                 // 元素类型
    edgeListening?: boolean;      // 是否开启边的拖拽事件，默认开启
    anchorListening?: boolean;    // 是否开启锚点的拖拽事件，默认开启
    rotationListening?: boolean;  // 是否开启旋转事件，默认开启
    keepRatio?: boolean;          // 是否开启等比缩放，默认关闭
    minWH?: WH;                   // 最小尺寸限制，默认[-Infinity, -Infinity]
    maxWH?: WH;                   // 最大尺寸限制，默认[Infinity, Infinity]
}
export const selectionBoxConfig = [{
    type: 'shape_square',
    minWH: [500, 500] as WH,
    maxWH: [2000, 2000] as WH,
}, {
    type: 'frame',
    minWH: [1, 1] as WH,
}]

export const getSelectionBoxConfig = (type: string) => {
    const config = selectionBoxConfig.find(c => c.type === type)
    return {
        type,
        edgeListening: true,
        anchorListening: true,
        rotationListening: true,
        keepRatio: false,
        minWH: [-Infinity, -Infinity] as WH,
        maxWH: [Infinity, Infinity] as WH,
        ...config,
    }
}