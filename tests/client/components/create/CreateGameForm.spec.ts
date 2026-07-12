import {shallowMount} from '@vue/test-utils';
import {globalConfig} from '../getLocalVue';
import {expect} from 'chai';
import CreateGameForm from '@/client/components/create/CreateGameForm.vue';

describe('CreateGameForm', () => {
  it('mounts without errors', () => {
    const wrapper = shallowMount(CreateGameForm, {
      ...globalConfig,
    });
    expect(wrapper.exists()).to.be.true;
    expect(wrapper.find('#mulligan-checkbox').exists()).to.be.true;
  });

  it('enables all available mulligan tiers by default', async () => {
    const wrapper = shallowMount(CreateGameForm, {
      ...globalConfig,
    });
    const vm = wrapper.vm as any;
    vm.playersCount = 2;
    vm.expansions.prelude = true;
    vm.expansions.ceo = true;
    await wrapper.vm.$nextTick();
    await wrapper.find('#mulligan-checkbox').setValue(true);

    expect(vm.mulligan).to.deep.eq({project: true, corporation: true, prelude: true, ceo: true});

    vm.expansions.ceo = false;
    await wrapper.vm.$nextTick();
    expect(vm.mulligan.ceo).is.false;

    vm.players[0].name = 'Mira';
    vm.players[1].name = 'Sol';
    const settings = JSON.parse(await vm.serializeSettings());
    expect(settings.mulligan).to.deep.eq({project: true, corporation: true, prelude: true, ceo: false});
  });
});
