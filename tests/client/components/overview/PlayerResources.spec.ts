import {shallowMount} from '@vue/test-utils';
import {expect} from 'chai';
import {globalConfig} from '../getLocalVue';
import PlayerResources from '@/client/components/overview/PlayerResources.vue';
import {fakePublicPlayerModel} from '../testHelpers';
import {Resource} from '@/common/Resource';

describe('PlayerResources', () => {
  it('mounts without errors', () => {
    const wrapper = shallowMount(PlayerResources, {
      ...globalConfig,
      props: {
        player: fakePublicPlayerModel(),
      },
    });
    expect(wrapper.exists()).to.be.true;
  });

  it('routes feedback to the matching resource tile', () => {
    const delta = {
      playerColor: 'red' as const,
      playerName: 'Red',
      resource: Resource.PLANTS,
      amount: 2,
      production: 0,
    };
    const wrapper = shallowMount(PlayerResources, {
      ...globalConfig,
      props: {
        player: fakePublicPlayerModel({color: 'red'}),
        resourceDeltas: [delta],
      },
    });

    const resources = wrapper.findAllComponents({name: 'PlayerResource'});
    expect(resources.find((resource) => resource.props('type') === Resource.PLANTS)?.props('delta')).to.deep.equal(delta);
    expect(resources.filter((resource) => resource.props('delta') !== undefined)).to.have.length(1);
  });
});
