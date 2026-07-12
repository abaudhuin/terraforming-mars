import {expect} from 'chai';
import {getActionFeedback} from '@/client/utils/ActionFeedback';
import {fakePlayerViewModel} from '../components/testHelpers';
import {GlobalParameter} from '@/common/GlobalParameter';
import {Resource} from '@/common/Resource';
import {SpaceType} from '@/common/boards/SpaceType';
import {TileType} from '@/common/TileType';
import {ColonyName} from '@/common/colonies/ColonyName';
import {SpaceId} from '@/common/Types';

describe('ActionFeedback', () => {
  it('finds resource, global, board, and colony changes in one server update', () => {
    const previous = fakePlayerViewModel();
    previous.players[0].megacredits = 10;
    previous.players[0].plantProduction = 1;
    previous.game.spaces = [{id: '01' as SpaceId, x: 0, y: 0, spaceType: SpaceType.LAND, bonus: []}];
    previous.game.colonies = [{name: ColonyName.CERES, colonies: [], isActive: true, trackPosition: 1, visitor: undefined}];

    const next = structuredClone(previous);
    next.players[0].megacredits = 17;
    next.players[0].plantProduction = 2;
    next.game.oxygenLevel = 3;
    next.game.spaces[0].tileType = TileType.CITY;
    next.game.colonies[0].trackPosition = 2;

    const feedback = getActionFeedback(previous, next);

    expect(feedback.resources).to.deep.include({
      playerColor: previous.players[0].color,
      playerName: previous.players[0].name,
      resource: Resource.MEGACREDITS,
      amount: 7,
      production: 0,
    });
    expect(feedback.resources).to.deep.include({
      playerColor: previous.players[0].color,
      playerName: previous.players[0].name,
      resource: Resource.PLANTS,
      amount: 0,
      production: 1,
    });
    expect(feedback.globals).to.deep.include({parameter: GlobalParameter.OXYGEN, amount: 3});
    expect(feedback.spaces).to.deep.eq(['01']);
    expect(feedback.colonies).to.deep.eq([ColonyName.CERES]);
  });
});
