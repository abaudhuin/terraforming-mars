import {shallowMount} from '@vue/test-utils';
import {expect} from 'chai';
import {globalConfig} from '../getLocalVue';
import Colony from '@/client/components/colonies/Colony.vue';
import {ColonyName} from '@/common/colonies/ColonyName';

describe('Colony', () => {
  it('mounts without errors', () => {
    const wrapper = shallowMount(Colony, {
      ...globalConfig,
      props: {
        colony: {
          colonies: [],
          isActive: false,
          name: ColonyName.GANYMEDE,
          trackPosition: 1,
          visitor: undefined,
        },
      },
    });
    expect(wrapper.exists()).to.be.true;
  });

  it('shows a compact visitor badge instead of floating a ship over the colony art', () => {
    const wrapper = shallowMount(Colony, {
      ...globalConfig,
      props: {
        colony: {
          colonies: [],
          isActive: false,
          name: ColonyName.HYGIEA,
          trackPosition: 1,
          visitor: 'red',
        },
      },
    });

    expect(wrapper.find('.colony-spaceship').exists()).to.be.false;
    expect(wrapper.find('.colony-visitor-chip').exists()).to.be.true;
    expect(wrapper.find('.colony-visitor-chip .colonies-fleet-red').exists()).to.be.true;
  });
});
