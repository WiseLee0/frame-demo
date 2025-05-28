
export function flattenNestedArrays<T>(input: (T | T[])[]): T[][] {
    const result: T[][] = [];

    function extractArrays(arr: (T | T[])[], level: number = 0) {
        const currentLevel: T[] = [];

        // 确保结果数组有当前层级的容器
        if (result.length <= level) {
            result.push([]);
        }

        for (const item of arr) {
            if (Array.isArray(item)) {
                // 如果是数组，递归处理下一层级
                extractArrays(item, level + 1);
            } else {
                // 如果不是数组，添加到当前层级
                currentLevel.push(item);
            }
        }

        // 将当前层级的非数组元素合并到结果中
        result[level] = result[level].concat(currentLevel);
    }

    extractArrays(input);
    return result.filter(item => item.length);
}