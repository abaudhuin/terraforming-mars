import {shallowMount} from '@vue/test-utils';
import {expect} from 'chai';
import {globalConfig} from './getLocalVue';
import PlayerHome from '@/client/components/PlayerHome.vue';
import {fakePlayerViewModel, fakePublicPlayerModel} from './testHelpers';
import {FakeLocalStorage} from './FakeLocalStorage';
import raw_settings from '@/genfiles/settings.json';
import {CardName} from '@/common/cards/CardName';

describe('PlayerHome', () => {
  let localStorage: FakeLocalStorage;

  beforeEach(() => {
    localStorage = new FakeLocalStorage();
    FakeLocalStorage.register(localStorage);
  });

  afterEach(() => {
    FakeLocalStorage.deregister(localStorage);
  });

  it('mounts without errors', () => {
    const wrapper = shallowMount(PlayerHome, {
      ...globalConfig,
      parentComponent: {
        methods: {
          getVisibilityState: () => true,
          setVisibilityState: () => {},
        },
      } as any,
      props: {
        playerView: fakePlayerViewModel(),
        settings: raw_settings,
      },
    });
    expect(wrapper.exists()).to.be.true;
  });

  it('uses the card desk while waiting instead of rendering an empty action panel', () => {
    const thisPlayer = fakePublicPlayerModel({
      tableau: [{name: CardName.ACQUIRED_COMPANY}],
      cardsInHandNbr: 1,
    });
    const otherPlayer = fakePublicPlayerModel({color: 'red', id: 'p-red-id', name: 'red', isActive: true});
    const wrapper = shallowMount(PlayerHome, {
      ...globalConfig,
      parentComponent: {
        methods: {
          getVisibilityState: () => true,
          setVisibilityState: () => {},
        },
      } as any,
      props: {
        playerView: fakePlayerViewModel({
          thisPlayer,
          players: [thisPlayer, otherPlayer],
          cardsInHand: [{name: CardName.ANTS}],
          waitingFor: undefined,
        }),
      },
    });

    expect(wrapper.find('.tm-action-workbench').exists()).to.be.false;
    expect(wrapper.find('.tm-passive-sync').exists()).to.be.true;
    expect(wrapper.find('.tm-card-desk').exists()).to.be.true;
    expect(wrapper.find('.tm-action-hand-button').exists()).to.be.false;
    expect(wrapper.find('.tm-hand-open-button').exists()).to.be.false;
    expect(wrapper.find('.tm-control--cards .tm-control-badge').text()).to.eq('1');
  });

  it('shows the action workbench when the player has an input', () => {
    const thisPlayer = fakePublicPlayerModel({tableau: [{name: CardName.ACQUIRED_COMPANY}]});
    const otherPlayer = fakePublicPlayerModel({color: 'red', id: 'p-red-id', name: 'red'});
    const wrapper = shallowMount(PlayerHome, {
      ...globalConfig,
      parentComponent: {
        methods: {
          getVisibilityState: () => true,
          setVisibilityState: () => {},
        },
      } as any,
      props: {
        playerView: fakePlayerViewModel({
          thisPlayer,
          players: [thisPlayer, otherPlayer],
          waitingFor: {type: 'option', title: 'Do something', buttonLabel: 'Confirm'},
        }),
      },
    });

    expect(wrapper.find('.tm-action-workbench').exists()).to.be.true;
    expect(wrapper.find('.tm-passive-sync').exists()).to.be.false;
  });

  it('preserves an open overlay when a refreshed player model arrives', async () => {
    const thisPlayer = fakePublicPlayerModel({
      tableau: [{name: CardName.ACQUIRED_COMPANY}],
      cardsInHandNbr: 1,
    });
    const otherPlayer = fakePublicPlayerModel({color: 'red', id: 'p-red-id', name: 'red', isActive: true});
    const initialView = fakePlayerViewModel({
      thisPlayer,
      players: [thisPlayer, otherPlayer],
      cardsInHand: [{name: CardName.ANTS}],
    });
    const wrapper = shallowMount(PlayerHome, {
      ...globalConfig,
      parentComponent: {
        methods: {
          getVisibilityState: () => true,
          setVisibilityState: () => {},
        },
      } as any,
      props: {playerView: initialView},
    });

    (wrapper.vm as any).openCardsOverlay();
    await wrapper.vm.$nextTick();
    expect((wrapper.vm as any).activeOverlay).to.eq('cards');

    await wrapper.setProps({
      playerView: {
        ...initialView,
        game: {...initialView.game, gameAge: initialView.game.gameAge + 1, step: initialView.game.step + 1},
      },
    });

    expect((wrapper.vm as any).activeOverlay).to.eq('cards');
    expect(wrapper.find('.tm-modal--cards').exists()).to.be.true;
  });
});
