import {shallowMount} from '@vue/test-utils';
import {expect} from 'chai';
import {globalConfig} from '../getLocalVue';
import PlayerResources from '@/client/components/overview/PlayerResources.vue';
import {fakePublicPlayerModel} from '../testHelpers';

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

  it('renders the six standard resources without transient feedback props', () => {
    const wrapper = shallowMount(PlayerResources, {
      ...globalConfig,
      props: {
        player: fakePublicPlayerModel({color: 'red'}),
      },
    });

    const resources = wrapper.findAllComponents({name: 'PlayerResource'});
    expect(resources).to.have.length(6);
    expect(resources.every((resource) => resource.props('delta') === undefined)).to.eq(true);
  });
});
