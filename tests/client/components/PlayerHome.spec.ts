import {shallowMount} from '@vue/test-utils';
import {expect} from 'chai';
import {globalConfig} from './getLocalVue';
import PlayerHome from '@/client/components/PlayerHome.vue';
import {fakePlayerViewModel, fakePublicPlayerModel} from './testHelpers';
import {FakeLocalStorage} from './FakeLocalStorage';
import raw_settings from '@/genfiles/settings.json';
import {CardName} from '@/common/cards/CardName';
import {Resource} from '@/common/Resource';

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
    expect(wrapper.find('.tm-action-workbench > .tm-panel-heading').exists()).to.be.false;
    expect(wrapper.find('.tm-passive-sync').exists()).to.be.false;
  });

  it('uses the acting layout for a solo player with an input', () => {
    const thisPlayer = fakePublicPlayerModel({tableau: [{name: CardName.ACQUIRED_COMPANY}]});
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
          players: [thisPlayer],
          waitingFor: {type: 'option', title: 'Take another action', buttonLabel: 'Confirm'},
        }),
      },
    });

    expect(wrapper.classes()).to.include('tm-player-table--acting');
    expect(wrapper.classes()).not.to.include('tm-player-table--passive');
    expect(wrapper.find('.tm-action-workbench').exists()).to.be.true;
  });

  it('uses a Focus/History activity rail and clamps available colony fleets', () => {
    const thisPlayer = fakePublicPlayerModel({
      tableau: [{name: CardName.ACQUIRED_COMPANY}],
      fleetSize: 2,
      tradesThisGeneration: 3,
    });
    const wrapper = shallowMount(PlayerHome, {
      ...globalConfig,
      parentComponent: {
        methods: {
          getVisibilityState: () => true,
          setVisibilityState: () => {},
        },
      } as any,
      props: {
        playerView: fakePlayerViewModel({thisPlayer, players: [thisPlayer]}),
      },
    });

    expect(wrapper.findComponent({name: 'ActionSpotlight'}).exists()).to.be.true;
    expect(wrapper.findComponent({name: 'LogPanel'}).props('headerTitle')).to.eq('History');
    expect(wrapper.findAll('.tm-activity-mode-tabs button').map((button) => button.text())).to.deep.eq(['Focus', 'History']);
    expect((wrapper.vm as any).getAvailableFleetCount(thisPlayer)).to.eq(0);
  });

  it('persists independently collapsible and resizable table panels', async () => {
    const thisPlayer = fakePublicPlayerModel({tableau: [{name: CardName.ACQUIRED_COMPANY}]});
    const wrapper = shallowMount(PlayerHome, {
      ...globalConfig,
      parentComponent: {
        methods: {
          getVisibilityState: () => true,
          setVisibilityState: () => {},
        },
      } as any,
      props: {
        playerView: fakePlayerViewModel({thisPlayer, players: [thisPlayer]}),
      },
    });

    expect(wrapper.find('.tm-layout-resize-handle--player').exists()).to.be.true;
    expect(wrapper.find('.tm-bottom-tray-toggle').attributes('aria-expanded')).to.eq('true');

    await wrapper.find('.tm-bottom-tray-toggle').trigger('click');

    expect(wrapper.classes()).to.include('tm-player-table--bottom-collapsed');
    expect(wrapper.find('.tm-bottom-tray-toggle').attributes('aria-expanded')).to.eq('false');
    expect(localStorage.getItem('tm-player-table-bottom-tray-collapsed')).to.eq('true');

    (wrapper.vm as any).playerRailWidth = 418;
    (wrapper.vm as any).resizeTarget = 'player';
    (wrapper.vm as any).stopLayoutResize();
    expect(localStorage.getItem('tm-player-table-player-rail-width')).to.eq('418');
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

  it('detects live feedback when game age changes without a step change', async () => {
    const initialPlayer = fakePublicPlayerModel({tableau: [{name: CardName.ACQUIRED_COMPANY}], megacredits: 10});
    const refreshedPlayer = fakePublicPlayerModel({tableau: [{name: CardName.ACQUIRED_COMPANY}], megacredits: 15});
    const initialView = fakePlayerViewModel({
      thisPlayer: initialPlayer,
      players: [initialPlayer],
    });
    initialView.game.gameAge = 10;
    initialView.game.step = 7;
    const wrapper = shallowMount(PlayerHome, {
      ...globalConfig,
      parentComponent: {
        methods: {getVisibilityState: () => true, setVisibilityState: () => {}},
      } as any,
      props: {playerView: initialView},
    });

    await wrapper.setProps({
      playerView: {
        ...initialView,
        thisPlayer: refreshedPlayer,
        players: [refreshedPlayer],
        game: {...initialView.game, gameAge: 11},
      },
    });

    expect((wrapper.vm as any).playerView.game.step).to.eq(7);
    expect((wrapper.vm as any).resourceDeltas).to.deep.include({
      playerColor: refreshedPlayer.color,
      playerName: refreshedPlayer.name,
      resource: Resource.MEGACREDITS,
      amount: 5,
      production: 0,
    });
    wrapper.unmount();
  });
});
