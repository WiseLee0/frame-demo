interface Node {
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;
}

// 判断两个矩形节点是否相交
export function hitTestRectNodes(node1: Node, node2: Node): boolean {
    if (node1.rotation === 0 && node2.rotation === 0) {
        // 如果两个矩形都没有旋转
        return hitTestRectangle(node1, node2);
    } else if (node1.rotation === 0 || node2.rotation === 0) {
        // 如果一个矩形有旋转，另一个没有
        if (node1.rotation === 0) {
            return hitTestRectangleAndRotatedRectangle(node1, node2);
        } else {
            return hitTestRectangleAndRotatedRectangle(node2, node1);
        }
    } else {
        // 两个矩形都有旋转
        return hitTestRotatedRectangles(node1, node2);
    }
}

// 无旋转矩形的碰撞检测
function hitTestRectangle(rect1: Node, rect2: Node): boolean {
    return rect1.x < rect2.x + rect2.width &&
        rect1.x + rect1.width > rect2.x &&
        rect1.y < rect2.y + rect2.height &&
        rect1.y + rect1.height > rect2.y;
}

// 旋转矩形与非旋转矩形的碰撞检测
function hitTestRectangleAndRotatedRectangle(rect: Node, rotatedRect: Node): boolean {
    // 获取旋转矩形的四个顶点
    const rotatedCorners = getRotatedRectangleCorners(rotatedRect);

    // 获取非旋转矩形的四个顶点
    const rectCorners = [
        { x: rect.x, y: rect.y },
        { x: rect.x + rect.width, y: rect.y },
        { x: rect.x + rect.width, y: rect.y + rect.height },
        { x: rect.x, y: rect.y + rect.height }
    ];

    // 检查所有分离轴
    const axes = [
        // 非旋转矩形的边法线
        { x: 1, y: 0 },
        { x: 0, y: 1 },

        // 旋转矩形的边法线
        getNormal(rotatedCorners[0], rotatedCorners[1]),
        getNormal(rotatedCorners[1], rotatedCorners[2])
    ];

    for (const axis of axes) {
        if (!overlapOnAxis(rectCorners, rotatedCorners, axis)) {
            return false;
        }
    }

    return true;
}

// 获取旋转矩形的四个顶点坐标
export function getRotatedRectangleCorners(rect: Node): { x: number; y: number }[] {
    const angle = (rect.rotation * Math.PI) / 180;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    // 相对于旋转后左上角的局部坐标
    const localCorners = [
        { x: 0, y: 0 },
        { x: rect.width * cos, y: rect.width * sin },
        {
            x: rect.width * cos - rect.height * sin,
            y: rect.width * sin + rect.height * cos
        },
        { x: -rect.height * sin, y: rect.height * cos }
    ];

    // 转换为世界坐标
    return localCorners.map(corner => {
        return {
            x: rect.x + corner.x,
            y: rect.y + corner.y
        };
    });
}

// 获取边的法线向量（保持不变）
function getNormal(p1: { x: number; y: number }, p2: { x: number; y: number }): { x: number; y: number } {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    // 返回垂直于边的单位向量
    const length = Math.sqrt(dx * dx + dy * dy);
    return {
        x: -dy / length,
        y: dx / length
    };
}

// 检查两个多边形在给定轴上的投影是否重叠
function overlapOnAxis(poly1: { x: number; y: number }[], poly2: { x: number; y: number }[], axis: { x: number; y: number }): boolean {
    let min1 = Infinity, max1 = -Infinity;
    let min2 = Infinity, max2 = -Infinity;

    for (const point of poly1) {
        const projection = point.x * axis.x + point.y * axis.y;
        min1 = Math.min(min1, projection);
        max1 = Math.max(max1, projection);
    }

    for (const point of poly2) {
        const projection = point.x * axis.x + point.y * axis.y;
        min2 = Math.min(min2, projection);
        max2 = Math.max(max2, projection);
    }

    return max1 >= min2 && max2 >= min1;
}

// 两个旋转矩形的碰撞检测
function hitTestRotatedRectangles(rect1: Node, rect2: Node): boolean {
    const corners1 = getRotatedRectangleCorners(rect1);
    const corners2 = getRotatedRectangleCorners(rect2);

    // 检查所有分离轴
    const axes = [
        getNormal(corners1[0], corners1[1]),
        getNormal(corners1[1], corners1[2]),
        getNormal(corners2[0], corners2[1]),
        getNormal(corners2[1], corners2[2])
    ];

    for (const axis of axes) {
        if (!overlapOnAxis(corners1, corners2, axis)) {
            return false;
        }
    }

    return true;
}

export function isPointInRect(
    point: { x: number; y: number },
    rect: { x: number; y: number; width: number; height: number }
): boolean {
    return (
        point.x >= rect.x &&
        point.x <= rect.x + rect.width &&
        point.y >= rect.y &&
        point.y <= rect.y + rect.height
    );
}