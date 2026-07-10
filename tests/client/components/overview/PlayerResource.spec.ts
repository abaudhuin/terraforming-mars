import {shallowMount} from '@vue/test-utils';
import {globalConfig} from '../getLocalVue';
import {expect} from 'chai';
import PlayerResource from '@/client/components/overview/PlayerResource.vue';
import {Resource} from '@/common/Resource';
import {PreferencesManager} from '@/client/utils/PreferencesManager';
import {FakeLocalStorage} from '../FakeLocalStorage';

describe('PlayerResource', () => {
  let localStorage: FakeLocalStorage;
  beforeEach(() => {
    localStorage = new FakeLocalStorage();
    FakeLocalStorage.register(localStorage);
    PreferencesManager.INSTANCE.set('learner_mode', true);
  });
  afterEach(() => {
    FakeLocalStorage.deregister(localStorage);
  });

  it('Does not show resource value when it is zero', () => {
    const wrapper = shallowMount(PlayerResource, {
      ...globalConfig,
      props: {
        type: Resource.HEAT,
        count: 10,
        production: 1,
      },
    });
    expect(wrapper.find('[data-test="resource-value"]').exists()).is.false;
  });

  it('Show resource value for heat', () => {
    const wrapper = shallowMount(PlayerResource, {
      ...globalConfig,
      props: {
        type: Resource.HEAT,
        count: 10,
        production: 1,
        value: 1,
      },
    });
    expect(wrapper.find('[data-test="resource-value"]').exists()).is.true;
  });

  it('Does not show default steel and titanium values in learner mode', () => {
    for (const [type, value] of [[Resource.STEEL, 2], [Resource.TITANIUM, 3]] as const) {
      const wrapper = shallowMount(PlayerResource, {
        ...globalConfig,
        props: {
          type,
          count: 10,
          production: 1,
          value,
        },
      });

      expect(wrapper.find('[data-test="resource-value"]').exists()).is.false;
    }
  });

  it('Shows increased steel and titanium values', () => {
    for (const [type, value] of [[Resource.STEEL, 3], [Resource.TITANIUM, 4]] as const) {
      const wrapper = shallowMount(PlayerResource, {
        ...globalConfig,
        props: {
          type,
          count: 10,
          production: 1,
          value,
        },
      });

      expect(wrapper.find('[data-test="resource-value"]').text()).eq(`${value}M€`);
    }
  });
});
