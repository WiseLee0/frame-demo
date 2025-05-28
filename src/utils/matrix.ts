import { Transform } from "konva/lib/Util"

export const getTransform = (box: any) => {
    const { x, y, rotation = 0, scaleX = 1, scaleY = 1, skewX = 0, skewY = 0, offsetX = 0, offsetY = 0 } = box

    const m = new Transform()
    m.reset();

    if (x !== 0 || y !== 0) {
        m.translate(x, y);
    }
    if (rotation !== 0) {
        m.rotate(rotation * Math.PI / 180);
    }
    if (skewX !== 0 || skewY !== 0) {
        m.skew(skewX, skewY);
    }
    if (scaleX !== 1 || scaleY !== 1) {
        m.scale(scaleX, scaleY);
    }
    if (offsetX !== 0 || offsetY !== 0) {
        m.translate(-1 * offsetX, -1 * offsetY);
    }
    return m
}