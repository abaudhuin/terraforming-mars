import {expect} from 'chai';
import {BOARD_PAINT_HEIGHT, BOARD_PAINT_WIDTH, calculateBoardFit} from '@/client/utils/BoardFit';

describe('calculateBoardFit', () => {
  for (const [width, height, inset] of [
    [756, 388, 48],
    [916, 388, 48],
    [246, 514, 48],
    [1799, 929, 0],
  ]) {
    it(`contains the full board in ${width}x${height} with a ${inset}px inset`, () => {
      const fit = calculateBoardFit(width, height, inset, 1.65);
      expect(fit.scale * BOARD_PAINT_WIDTH).to.be.at.most(width - 20 + 0.001);
      expect(fit.scale * BOARD_PAINT_HEIGHT).to.be.at.most(height - inset - 20 + 0.001);
      expect(fit.centerY).to.eq((height - inset) / 2);
    });
  }
});
