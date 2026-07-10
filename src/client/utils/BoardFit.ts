export const BOARD_PAINT_WIDTH = 718;
export const BOARD_PAINT_HEIGHT = 608;

export type BoardFit = {
  scale: number;
  centerX: number;
  centerY: number;
};

export function calculateBoardFit(
  viewportWidth: number,
  viewportHeight: number,
  bottomInset = 0,
  maxScale = 1.6,
  horizontalGutter = 10,
  verticalGutter = 4,
): BoardFit {
  const safeWidth = Math.max(0, viewportWidth - horizontalGutter * 2);
  const safeHeight = Math.max(0, viewportHeight - Math.max(0, bottomInset) - verticalGutter * 2);
  const scale = Math.max(0, Math.min(maxScale, safeWidth / BOARD_PAINT_WIDTH, safeHeight / BOARD_PAINT_HEIGHT));

  return {
    scale,
    centerX: viewportWidth / 2,
    centerY: Math.max(0, viewportHeight - Math.max(0, bottomInset)) / 2,
  };
}
