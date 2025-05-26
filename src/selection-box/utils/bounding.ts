interface Point {
    x: number;
    y: number;
}

export function getPointsBoundingBox(points: Point[]): [number, number, number, number] {
    if (points.length === 0) {
        throw new Error("Points array cannot be empty");
    }

    // 初始化最小最大值
    let minX = points[0].x;
    let maxX = points[0].x;
    let minY = points[0].y;
    let maxY = points[0].y;

    // 遍历所有点，找出边界值
    for (const point of points) {
        minX = Math.min(minX, point.x);
        maxX = Math.max(maxX, point.x);
        minY = Math.min(minY, point.y);
        maxY = Math.max(maxY, point.y);
    }

    // 计算包围盒的位置和尺寸
    const x = minX;
    const y = minY;
    const width = maxX - minX;
    const height = maxY - minY;

    return [x, y, width, height];
}
