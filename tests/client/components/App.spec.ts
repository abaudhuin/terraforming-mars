import {flushPromises, shallowMount} from '@vue/test-utils';
import {expect} from 'chai';
import {globalConfig} from './getLocalVue';
import App from '@/client/components/App.vue';
import {fakePlayerViewModel} from './testHelpers';
import {vi} from 'vitest';

describe('App', () => {
  it('mounts without errors', () => {
    const wrapper = shallowMount(App, globalConfig);
    expect(wrapper.exists()).to.be.true;
  });

  it('keeps PlayerHome mounted when refreshed player data arrives', async () => {
    const originalFetch = globalThis.fetch;
    const firstPlayerView = fakePlayerViewModel();
    const refreshedPlayerView = fakePlayerViewModel({game: {step: 1, gameAge: 1}});
    const wrapper = shallowMount(App, globalConfig);
    const replaceState = vi.spyOn(window.history, 'replaceState').mockImplementation(() => {});

    try {
      await wrapper.setData({screen: 'player-home', playerView: firstPlayerView});
      await flushPromises();
      const playerHome = wrapper.find('player-home-stub');
      expect(playerHome.exists()).to.be.true;
      const playerHomeElement = playerHome.element;

      globalThis.fetch = () => Promise.resolve({
        ok: true,
        json: () => Promise.resolve(refreshedPlayerView),
      } as Response);
      (wrapper.vm as any).updatePlayer();
      await flushPromises();

      expect(wrapper.find('player-home-stub').element).to.equal(playerHomeElement);
      expect((wrapper.vm as any).playerView.game.step).to.equal(1);
      expect((wrapper.vm as any).screen).to.equal('player-home');
    } finally {
      wrapper.unmount();
      globalThis.fetch = originalFetch;
      replaceState.mockRestore();
    }
  });
});
