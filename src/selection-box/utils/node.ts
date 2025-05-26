interface Node {
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;
}

export function getReverseRotationNode(rotatedRect: Node): Node {
    const rotationRad = (rotatedRect.rotation * Math.PI) / 180;
    const cosTheta = Math.cos(rotationRad);
    const sinTheta = Math.sin(rotationRad);
    
    // 旋转后的中心点
    const centerX = rotatedRect.x + rotatedRect.width / 2;
    const centerY = rotatedRect.y + rotatedRect.height / 2;
    
    // 原始矩形的尺寸（与旋转后的相同）
    const originalWidth = rotatedRect.width;
    const originalHeight = rotatedRect.height;
    
    // 原始矩形的中心点（与旋转后的相同）
    const originalCenterX = centerX;
    const originalCenterY = centerY;
    
    // 原始左上角相对于中心点的坐标
    const relativeOriginalX = -originalWidth / 2;
    const relativeOriginalY = -originalHeight / 2;
    
    // 应用反向旋转（-rotation）来计算原始左上角
    const newRelativeX = relativeOriginalX * cosTheta - relativeOriginalY * sinTheta;
    const newRelativeY = relativeOriginalX * sinTheta + relativeOriginalY * cosTheta;
    
    // 转换为绝对坐标
    const originalX = originalCenterX + newRelativeX;
    const originalY = originalCenterY + newRelativeY;

    return {
        ...rotatedRect,
        x: originalX,
        y: originalY,
        rotation: -rotatedRect.rotation
    }
}