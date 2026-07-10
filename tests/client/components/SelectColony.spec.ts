import {shallowMount} from '@vue/test-utils';
import {expect} from 'chai';
import {globalConfig} from './getLocalVue';
import SelectColony from '@/client/components/SelectColony.vue';
import {PlayerViewModel} from '@/common/models/PlayerModel';
import {ColonyName} from '@/common/colonies/ColonyName';

describe('SelectColony', () => {
  it('mounts without errors', () => {
    const wrapper = shallowMount(SelectColony, {
      ...globalConfig,
      props: {
        playerView: {} as PlayerViewModel,
        playerinput: {
          title: 'Select a colony',
          buttonLabel: 'Save',
          type: 'colony',
          coloniesModel: [],
        },
        onsave: () => {},
        showsave: true,
        showtitle: true,
      },
    });
    expect(wrapper.exists()).to.be.true;
  });

  it('shows trade fleet state and visiting fleets for colony trades', () => {
    const wrapper = shallowMount(SelectColony, {
      ...globalConfig,
      props: {
        playerView: {
          thisPlayer: {
            name: 'Red player',
            color: 'red',
            fleetSize: 2,
            tradesThisGeneration: 1,
          },
          players: [
            {
              name: 'Red player',
              color: 'red',
              fleetSize: 2,
              tradesThisGeneration: 1,
            },
            {
              name: 'Blue player',
              color: 'blue',
              fleetSize: 1,
              tradesThisGeneration: 0,
            },
          ],
        } as PlayerViewModel,
        playerinput: {
          title: 'Select colony tile for trade',
          buttonLabel: 'trade',
          type: 'colony',
          coloniesModel: [
            {
              colonies: [],
              isActive: true,
              name: ColonyName.CALLISTO,
              trackPosition: 0,
              visitor: 'blue',
            },
          ],
        },
        onsave: () => {},
        showsave: true,
        showtitle: true,
      },
    });

    expect(wrapper.find('.tm-colony-trade-status').exists()).to.be.true;
    expect(wrapper.find('.tm-colony-fleet-count').text()).to.contain('1/2');
    expect(wrapper.findAll('.tm-colony-player-fleets')).to.have.length(2);
    expect(wrapper.findAll('.tm-colony-fleet-count')[1].text()).to.contain('1/1');
    expect(wrapper.find('.tm-colony-visitor-chip').text()).to.contain(ColonyName.CALLISTO);
    expect(wrapper.find('.tm-colony-visitor-badge').text()).to.contain('blue');
  });
});
