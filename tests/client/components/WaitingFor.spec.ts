import {mount, shallowMount} from '@vue/test-utils';
import {globalConfig} from './getLocalVue';
import {expect} from 'chai';
import WaitingFor from '@/client/components/WaitingFor.vue';
import {RecursivePartial} from '@/common/utils/utils';
import {PlayerViewModel, PublicPlayerModel} from '@/common/models/PlayerModel';
import {Phase} from '@/common/Phase';
import {defineComponent, nextTick} from 'vue';
import {vi} from 'vitest';

describe('WaitingFor', () => {
  const thisPlayer: Partial<PublicPlayerModel> = {
    color: 'red',
  } as any;

  const playerView: RecursivePartial<PlayerViewModel> = {
    id: 'p-player-id',
    thisPlayer: thisPlayer as PublicPlayerModel,
    players: [thisPlayer as PublicPlayerModel],
    game: {
      phase: Phase.ACTION,
      gameAge: 1,
      undoCount: 0,
    },
  };

  it('renders player-input-factory when waitingfor is provided', () => {
    const wrapper = shallowMount(WaitingFor, {
      ...globalConfig,
      global: {
        ...globalConfig.global,
        stubs: {
          'PlayerInputFactory': {template: '<div class="stub-pif"></div>'},
        },
      },
      props: {
        playerView: playerView as PlayerViewModel,
        players: [thisPlayer as PublicPlayerModel],
        waitingfor: {
          type: 'option',
          title: 'test',
          buttonLabel: 'save',
        },
      },
    });
    expect(wrapper.find('.stub-pif').exists()).to.be.true;
    expect(wrapper.text()).to.not.include('Not your turn');
    wrapper.unmount();
  });

  it('shows "not your turn" when waitingfor is undefined', () => {
    const wrapper = shallowMount(WaitingFor, {
      ...globalConfig,
      global: {
        ...globalConfig.global,
        stubs: {
          'PlayerInputFactory': true,
        },
      },
      props: {
        playerView: playerView as PlayerViewModel,
        players: [thisPlayer as PublicPlayerModel],
        waitingfor: undefined,
      },
    });
    expect(wrapper.text()).to.include('Not your turn');
    wrapper.unmount();
  });

  it('can hide only the passive status while retaining the waiting component', () => {
    const wrapper = shallowMount(WaitingFor, {
      ...globalConfig,
      global: {
        ...globalConfig.global,
        stubs: {PlayerInputFactory: true},
      },
      props: {
        playerView: playerView as PlayerViewModel,
        waitingfor: undefined,
        showPassiveStatus: false,
      },
    });

    expect(wrapper.find('.tm-passive-waiting-message').exists()).to.be.false;
    wrapper.unmount();
  });

  it('resumes polling after a REFRESH that leaves the player passive', async () => {
    vi.useFakeTimers();
    const originalXMLHttpRequest = globalThis.XMLHttpRequest;
    const originalWindowXMLHttpRequest = window.XMLHttpRequest;
    const requests: Array<FakeXMLHttpRequest> = [];

    class FakeXMLHttpRequest {
      public status = 200;
      public response: unknown;
      public responseType = '';
      public onerror: (() => void) | null = null;
      public onload: (() => void) | null = null;
      public aborted = false;

      open() {}
      send() {
        requests.push(this);
      }
      abort() {
        this.aborted = true;
      }
    }

    globalThis.XMLHttpRequest = FakeXMLHttpRequest as any;
    window.XMLHttpRequest = FakeXMLHttpRequest as any;
    const refreshedPlayerView = {
      ...playerView,
      game: {...playerView.game, gameAge: 2},
    } as PlayerViewModel;
    let refreshCount = 0;
    const Harness = defineComponent({
      components: {WaitingFor},
      data() {
        return {currentPlayerView: playerView as PlayerViewModel};
      },
      methods: {
        updatePlayer() {
          refreshCount++;
          this.currentPlayerView = refreshedPlayerView;
        },
        updateSpectator() {},
        showAlert() {},
      },
      template: '<WaitingFor :playerView="currentPlayerView" :waitingfor="currentPlayerView.waitingFor"/>',
    });
    const wrapper = mount(Harness, {
      ...globalConfig,
      global: {
        ...globalConfig.global,
        stubs: {PlayerInputFactory: true},
      },
    });
    const root = wrapper.vm.$root as any;
    root.updatePlayer = () => (wrapper.vm as any).updatePlayer();
    root.updateSpectator = () => (wrapper.vm as any).updateSpectator();
    root.showAlert = () => {};

    try {
      vi.runOnlyPendingTimers();
      expect(requests).to.have.length(1);
      requests[0].response = {result: 'REFRESH', waitingFor: []};
      requests[0].onload?.();
      await nextTick();
      await nextTick();

      expect(refreshCount).to.equal(1);
      expect(vi.getTimerCount()).to.equal(1);
      vi.runOnlyPendingTimers();
      expect(requests).to.have.length(2);
    } finally {
      wrapper.unmount();
      globalThis.XMLHttpRequest = originalXMLHttpRequest;
      window.XMLHttpRequest = originalWindowXMLHttpRequest;
      vi.useRealTimers();
    }
  });
});
