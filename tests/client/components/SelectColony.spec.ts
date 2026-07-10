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
    expect(wrapper.find('.wf-component-title').text()).to.eq('Select a colony');
  });

  it('shows a compact self fleet state without redundant trade instructions', async () => {
    let response: unknown;
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
        onsave: (value: unknown) => response = value,
        showsave: true,
        showtitle: true,
      },
    });

    expect(wrapper.find('.tm-colony-trade-status').exists()).to.be.true;
    expect(wrapper.find('.tm-colony-fleet-count').text()).to.contain('1/2');
    expect(wrapper.findAll('.tm-colony-player-fleets')).to.have.length(1);
    expect(wrapper.find('.tm-colony-trade-title').exists()).to.be.false;
    expect(wrapper.find('.tm-colony-selected-summary').exists()).to.be.false;
    expect(wrapper.find('.tm-colony-visitor-list').exists()).to.be.false;
    expect(wrapper.find('.tm-colony-card-strip').exists()).to.be.true;
    expect(wrapper.find('.tm-colony-visitor-badge').text()).to.contain('blue');

    await wrapper.find('input[type="radio"]').setValue(true);
    expect(wrapper.find('.tm-colony-card-selected-mark').exists()).to.be.true;
    await wrapper.findComponent({name: 'AppButton'}).trigger('click');
    expect(response).to.deep.eq({type: 'colony', colonyName: ColonyName.CALLISTO});
  });
});
