import {shallowMount} from '@vue/test-utils';
import {expect} from 'chai';
import {globalConfig} from '../getLocalVue';
import PlayersOverview from '@/client/components/overview/PlayersOverview.vue';
import {fakeViewModel} from '../testHelpers';
import {Resource} from '@/common/Resource';

describe('PlayersOverview', () => {
  it('mounts without errors', () => {
    const wrapper = shallowMount(PlayersOverview, {
      ...globalConfig,
      parentComponent: {
        methods: {
          getVisibilityState: () => true,
          setVisibilityState: () => {},
        },
      } as any,
      props: {
        playerView: fakeViewModel(),
      },
    });
    expect(wrapper.exists()).to.be.true;
  });

  it('sends resource feedback only to its owning player', () => {
    const playerView = fakeViewModel();
    const player = playerView.players[0];
    const delta = {
      playerColor: player.color,
      playerName: player.name,
      resource: Resource.HEAT,
      amount: 5,
      production: 0,
    };
    const wrapper = shallowMount(PlayersOverview, {
      ...globalConfig,
      parentComponent: {
        methods: {
          getVisibilityState: () => true,
          setVisibilityState: () => {},
        },
      } as any,
      props: {playerView, resourceDeltas: [delta]},
    });

    const playerInfo = wrapper.findComponent({name: 'PlayerInfo'});
    expect(playerInfo.props('resourceDeltas')).to.deep.equal([delta]);
  });
});
