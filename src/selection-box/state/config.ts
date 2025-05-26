export interface SelectionBoxConfig {
    type: string;                 // 元素类型
    edgeListening?: boolean;      // 是否开启边的拖拽事件，默认开启
    anchorListening?: boolean;    // 是否开启锚点的拖拽事件，默认开启
    ratationListening?: boolean;  // 是否开启旋转事件，默认开启
    keepRatio?: boolean;          // 是否开启等比缩放，默认开启
    minWH?: [number, number];     // 最小尺寸限制，默认[-Infinity, -Infinity]
    maxWH?: [number, number];     // 最大尺寸限制，默认[Infinity, Infinity]
}