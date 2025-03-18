export function isPointInRect(
  px: number,
  py: number,
  x: number,
  y: number,
  w: number,
  h: number
): boolean {
  return px >= x && px <= x + w && py >= y && py <= y + h;
}
export function deleteNodeById(nodes: any[], id: string) {
  return nodes.filter((item) => {
    if (item.id === id) {
      return false;
    }
    if (item.children) {
      item.children = deleteNodeById(item.children, id);
    }
    return true;
  });
}
export function addChildById(nodes: any[], id: string, node: any) {
  return nodes.filter((item) => {
    if (item.id === id) {
      item.children = [...item.children, node];
    }
    if (item.children && item.id !== id) {
      item.children = addChildById(item.children, id, node);
    }
    return true;
  });
}

type TransformMatrix = {
  m00: number;
  m01: number;
  m02: number;
  m10: number;
  m11: number;
  m12: number;
};
export function extractRotationAngle(transform: TransformMatrix): number {
  // 提取 cosθ 和 sinθ
  const cosθ = transform.m00;
  const sinθ = transform.m10;

  // 计算弧度
  const θ_rad = Math.atan2(sinθ, cosθ);

  // 转换为角度并返回
  return θ_rad * (180 / Math.PI);
}
type KonvaCenterTransform = {
  x: number;
  y: number;
  offset: {
    x: number;
    y: number;
  };
  rotation: number;
};
export function convertToCenterRotation(
  originalX: number,
  originalY: number,
  width: number,
  height: number,
  rotation: number
): KonvaCenterTransform {
  const offsetX = width / 2;
  const offsetY = height / 2;
  const centerX = originalX + offsetX;
  const centerY = originalY + offsetY;
  return {
    x: centerX,
    y: centerY,
    offset: {
      x: offsetX,
      y: offsetY,
    },
    rotation: rotation,
  };
}

import { type UseBoundStore, StoreApi } from 'zustand';

export function createStoreUtils<T>(originStore: UseBoundStore<StoreApi<T>>) {
  type State = keyof T;

  /**
   * 响应式获取state
   * @example
   * const a = useStore((state) => state.a);
   * const a = useStore('a');
   */
  function useStore<K>(params: (state: T) => K): K;
  function useStore<K extends State>(params: K): T[K];
  function useStore<K extends State>(params: K | ((state: T) => K)) {
    if (typeof params === 'string') {
      return originStore((state) => state[params]);
    }

    if (typeof params === 'function') {
      return originStore(params);
    }

    console.warn('为避免不必要的re-render, useStore需要带上具体的字段使用');
  }

  /**
   * 直接获取state, 非响应式
   * @example
   * const state = getState();
   * const a = getState('a');
   * const [a, b] = getState(['a', 'b']);
   */
  function getState(): T;
  function getState<K extends State>(params: K): T[K];
  function getState<K extends State[]>(params: Readonly<K>): { [I in keyof K]: T[K[I]] };
  function getState<K extends State>(params?: K) {
    const allState = originStore.getState();

    if (typeof params === 'undefined') {
      return allState;
    }

    if (Array.isArray(params)) {
      return params.map((param) => (allState as any)[param]);
    }

    return allState[params];
  }

  /**
   * 设置state
   * 如果使用了immer middleware, 支持直接修改state, 无需返回值
   */
  function setState(params: T | Partial<T> | ((state: T) => T | Partial<T> | void), replace?: boolean) {
    // 使用any来绕过使用immer时的类型校验
    originStore.setState(params as any, replace as any);
  }

  return {
    useStore,
    getState,
    setState,
  };
}
