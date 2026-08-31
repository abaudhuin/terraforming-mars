import {mount} from '@vue/test-utils';
import {expect} from 'chai';
import {globalConfig} from '../getLocalVue';
import PlayerResourceChanges from '@/client/components/overview/PlayerResourceChanges.vue';
import {Resource} from '@/common/Resource';

describe('PlayerResourceChanges', () => {
  it('does not reserve header space without a visible change', () => {
    const wrapper = mount(PlayerResourceChanges, {
      ...globalConfig,
      props: {deltas: []},
    });

    expect(wrapper.find('.tm-resource-change-list').exists()).to.eq(false);
  });

  it('renders stock and production changes with their established iconography', () => {
    const wrapper = mount(PlayerResourceChanges, {
      ...globalConfig,
      props: {
        deltas: [
          {
            playerColor: 'red',
            playerName: 'Red',
            resource: Resource.MEGACREDITS,
            amount: 3,
            production: 2,
          },
          {
            playerColor: 'red',
            playerName: 'Red',
            resource: Resource.PLANTS,
            amount: -1,
            production: 1,
          },
        ],
      },
    });

    expect(wrapper.find('.resource_icon--megacredits').exists()).to.eq(true);
    expect(wrapper.find('.production.money').exists()).to.eq(true);
    expect(wrapper.find('.resource_icon--plants').exists()).to.eq(true);
    expect(wrapper.find('.production.plant').exists()).to.eq(true);
    expect(wrapper.findAll('.tm-resource-change-production-box')).to.have.length(2);
    expect(wrapper.text()).to.contain('+3');
    expect(wrapper.text()).to.contain('+2');
    expect(wrapper.text()).to.contain('-1');
    expect(wrapper.find('.tm-resource-change-token--loss').exists()).to.eq(true);
    expect(wrapper.attributes('aria-label')).to.contain('+2 MegaCredits production');
    expect(wrapper.attributes('aria-label')).to.contain('-1 plants');
  });

  it('filters zero-only entries out of the announcement and line', () => {
    const wrapper = mount(PlayerResourceChanges, {
      ...globalConfig,
      props: {
        deltas: [{
          playerColor: 'red',
          playerName: 'Red',
          resource: Resource.HEAT,
          amount: 0,
          production: 0,
        }],
      },
    });

    expect(wrapper.find('.tm-resource-change-list').exists()).to.eq(false);
  });
});
