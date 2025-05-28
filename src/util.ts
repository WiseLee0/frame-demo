import { type UseBoundStore, StoreApi } from 'zustand';
import { getProjectState } from './projectState';

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


export const getElementById = (id: string, elements?: any[]) => {
  if (!elements || !elements.length) {
    elements = getProjectState('elements');
  }
  const findElement = (elements: any) => {
    for (const element of elements) {
      if (element.id === id) {
        return element;
      }
      if (element?.elements?.length) {
        const ele = findElement(element?.elements) as any;
        if (ele) {
          return ele;
        }
      }
    }
    return null;
  };

  return findElement(elements);
};
