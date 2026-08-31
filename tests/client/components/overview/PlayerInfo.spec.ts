import {shallowMount} from '@vue/test-utils';
import {globalConfig} from '../getLocalVue';
import {expect} from 'chai';
import {CardName} from '@/common/cards/CardName';
import PlayerInfo from '@/client/components/overview/PlayerInfo.vue';
import {PlayerViewModel, PublicPlayerModel} from '@/common/models/PlayerModel';
import {RecursivePartial} from '@/common/utils/utils';
import {fakePublicPlayerModel, fakeTimerModel} from '../testHelpers';
import {Resource} from '@/common/Resource';

describe('PlayerInfo', () => {
  it('Played card count test', () => {
    const thisPlayer: RecursivePartial<PublicPlayerModel> = {
      color: 'blue',
      tableau: [
        {name: CardName.HELION},
        {name: CardName.ACQUIRED_COMPANY},
        {name: CardName.BACTOVIRAL_RESEARCH},
      ],
      timer: fakeTimerModel(),
      victoryPointsBreakdown: {
        total: 1,
      },
      tags: {},
    };
    const playerView: RecursivePartial<PlayerViewModel> = {
      thisPlayer: thisPlayer,
      id: 'playerid-foo',
      game: {
        gameOptions: {
          showTimers: false,
        },
      },
      players: [thisPlayer],
    };
    const playerInfo = shallowMount(PlayerInfo, {
      ...globalConfig,
      global: {
        ...globalConfig.global,
        mocks: {
          getVisibilityState: () => false,
          setVisibilityState: () => {},
          isServerSideRequestInProgress: false,
        },
      },
      props: {
        player: thisPlayer,
        playerView: playerView,
        playerIndex: 0,
        actionLabel: 'none',
      },
    });
    const test = playerInfo.find('div[class*="played-cards-count"]');
    expect(test.text()).to.eq('3');
  });

  it('places resource feedback beside identity and keeps compact discounts hidden', () => {
    const player = fakePublicPlayerModel({
      color: 'blue',
      name: 'Blue',
      tableau: [],
      timer: fakeTimerModel(),
      victoryPointsBreakdown: {total: 1},
      tags: {},
    });
    const playerView = {
      thisPlayer: player,
      game: {
        phase: 'action',
        gameOptions: {showTimers: false},
      },
    } as PlayerViewModel;
    const deltas = [{
      playerColor: 'blue' as const,
      playerName: 'Blue',
      resource: Resource.STEEL,
      amount: 2,
      production: 1,
    }];
    const wrapper = shallowMount(PlayerInfo, {
      ...globalConfig,
      props: {
        player,
        playerView,
        playerIndex: 0,
        actionLabel: 'none',
        resourceDeltas: deltas,
      },
    });

    expect(wrapper.findComponent({name: 'PlayerResourceChanges'}).props('deltas')).to.deep.eq(deltas);
    expect(wrapper.find('.player-info-details').findComponent({name: 'PlayerResourceChanges'}).exists()).to.eq(true);
    expect(wrapper.findComponent({name: 'PlayerResources'}).props('resourceDeltas')).to.eq(undefined);
    expect(wrapper.findComponent({name: 'PlayerTags'}).props('showDiscounts')).to.eq(false);
    expect(wrapper.findComponent({name: 'PlayerTags'}).props('showMainSummary')).to.eq(false);
    expect(wrapper.findComponent({name: 'PlayerTags'}).props('showPoints')).to.eq(false);
    expect(wrapper.find('.player-info-corp').attributes('title')).to.eq(undefined);
    expect(wrapper.find('.tm-player-economy-row .tm-rail-player-summary').exists()).to.eq(true);
  });

  it('uses the whole player card as the single dossier control', async () => {
    const player = fakePublicPlayerModel({color: 'blue', name: 'Blue', tableau: [], timer: fakeTimerModel()});
    const wrapper = shallowMount(PlayerInfo, {
      ...globalConfig,
      props: {
        player,
        playerView: {thisPlayer: player, game: {phase: 'action', gameOptions: {showTimers: false}}} as PlayerViewModel,
        playerIndex: 0,
        actionLabel: 'none',
      },
    });

    expect(wrapper.attributes('role')).to.eq('button');
    expect(wrapper.find('.tm-player-view-button').exists()).to.eq(false);
    expect(wrapper.findComponent({name: 'AppButton'}).exists()).to.eq(false);
    await wrapper.trigger('click');
    expect(wrapper.emitted('open-player')).to.deep.eq([['blue']]);
  });
});
