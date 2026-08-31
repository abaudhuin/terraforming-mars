import {shallowMount} from '@vue/test-utils';
import {expect} from 'chai';
import {globalConfig} from './getLocalVue';
import GameBoardView from '@/client/components/GameBoardView.vue';
import {fakeGameModel} from './testHelpers';

describe('GameBoardView', () => {
  it('mounts without errors', () => {
    const wrapper = shallowMount(GameBoardView, {
      ...globalConfig,
      props: {
        game: fakeGameModel(),
        tileView: 'show',
        players: [],
      },
    });
    expect(wrapper.exists()).to.be.true;
  });

  it('can render as a map-only surface without module launchers or a hit-shield', () => {
    const wrapper = shallowMount(GameBoardView, {
      ...globalConfig,
      props: {
        game: fakeGameModel(),
        tileView: 'show',
        players: [],
        showModuleLaunchers: false,
      },
    });
    expect(wrapper.find('.tm-board-modules').exists()).to.eq(false);
    expect(wrapper.find('.tm-ma-panel').exists()).to.eq(false);
    expect(wrapper.find('.tm-module-backdrop').exists()).to.eq(false);
    expect(wrapper.findComponent({name: 'Board'}).exists()).to.eq(true);
  });
});
