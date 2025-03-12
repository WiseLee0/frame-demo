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
