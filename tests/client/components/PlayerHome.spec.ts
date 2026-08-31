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

  it('uses a stable Focus/History activity rail and clamps available colony fleets', async () => {
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
    const history = wrapper.findComponent({name: 'LogPanel'});
    expect(history.props('headerTitle')).to.eq('History');
    expect(history.props('recentHistory')).to.be.false;
    expect(history.props('messageLimit')).to.eq(0);
    expect(wrapper.findAll('.tm-activity-mode-tabs button').map((button) => button.text())).to.deep.eq(['Focus', 'History']);
    expect((wrapper.vm as any).getAvailableFleetCount(thisPlayer)).to.eq(0);

    await wrapper.findAll('.tm-activity-mode-tabs button')[1].trigger('click');
    expect((wrapper.vm as any).activityMode).to.eq('history');
    expect(wrapper.findComponent({name: 'ActionSpotlight'}).exists()).to.be.false;

    await wrapper.findAll('.tm-activity-mode-tabs button')[0].trigger('click');
    expect(wrapper.findComponent({name: 'ActionSpotlight'}).exists()).to.be.true;
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

  it('resizes from the grab-time width without jumping on pointer-down', () => {
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
    const vm = wrapper.vm as any;
    vm.playerRailWidth = 360;
    const previousInnerWidth = window.innerWidth;
    Object.defineProperty(window, 'innerWidth', {configurable: true, value: 1600});

    vm.beginLayoutResize('player', {
      preventDefault: () => {},
      currentTarget: null,
      pointerId: 1,
      clientX: 320,
      clientY: 0,
    });
    expect(vm.playerRailWidth).to.eq(360);

    vm.updateLayoutResize({clientX: 352, clientY: 0});
    expect(vm.playerRailWidth).to.eq(392);
    vm.stopLayoutResize();
    expect(localStorage.getItem('tm-player-table-player-rail-width')).to.eq('392');

    Object.defineProperty(window, 'innerWidth', {configurable: true, value: previousInnerWidth});
  });

  it('offers useful side-panel and tray ranges at the minimum table size', () => {
    const thisPlayer = fakePublicPlayerModel({tableau: [{name: CardName.ACQUIRED_COMPANY}]});
    const wrapper = shallowMount(PlayerHome, {
      ...globalConfig,
      parentComponent: {
        methods: {getVisibilityState: () => true, setVisibilityState: () => {}},
      } as any,
      props: {playerView: fakePlayerViewModel({thisPlayer, players: [thisPlayer]})},
    });
    const vm = wrapper.vm as any;
    const previousWidth = window.innerWidth;
    const previousHeight = window.innerHeight;
    Object.defineProperty(window, 'innerWidth', {configurable: true, value: 1280});
    Object.defineProperty(window, 'innerHeight', {configurable: true, value: 720});

    try {
      vm.setLayoutDimension('player', -1000);
      expect(vm.playerRailWidth).to.eq(260);
      vm.setLayoutDimension('player', 1000);
      expect(vm.playerRailWidth).to.be.at.least(470);

      vm.playerRailWidth = 360;
      vm.setLayoutDimension('activity', -1000);
      expect(vm.activityRailWidth).to.eq(200);
      vm.setLayoutDimension('activity', 1000);
      expect(vm.activityRailWidth).to.be.at.least(420);

      vm.setLayoutDimension('bottom', -1000);
      expect(vm.bottomTrayHeight).to.eq(150);
      vm.setLayoutDimension('bottom', 1000);
      expect(vm.bottomTrayHeight).to.eq(360);
    } finally {
      Object.defineProperty(window, 'innerWidth', {configurable: true, value: previousWidth});
      Object.defineProperty(window, 'innerHeight', {configurable: true, value: previousHeight});
      wrapper.unmount();
    }
  });

  it('closes board-blocking review layers when space placement starts', async () => {
    const thisPlayer = fakePublicPlayerModel({tableau: [{name: CardName.ACQUIRED_COMPANY}]});
    const initialView = fakePlayerViewModel({
      thisPlayer,
      players: [thisPlayer],
      waitingFor: {type: 'option', title: 'Choose', buttonLabel: 'Continue'},
    });
    const wrapper = shallowMount(PlayerHome, {
      ...globalConfig,
      parentComponent: {
        methods: {getVisibilityState: () => true, setVisibilityState: () => {}},
      } as any,
      props: {playerView: initialView},
    });
    const vm = wrapper.vm as any;
    vm.activeOverlay = 'module';
    vm.activeModule = 'turmoil';

    await wrapper.setProps({
      playerView: {
        ...initialView,
        waitingFor: {type: 'space', title: 'Place greenery', spaces: ['01']},
      },
    });
    await wrapper.vm.$nextTick();

    expect(vm.activeOverlay).to.eq('none');
    expect(vm.activeModule).to.eq(undefined);
    wrapper.unmount();
  });

  it('keeps a mandatory decision visible without overwriting the stored collapsed preference', async () => {
    localStorage.setItem('tm-player-table-bottom-tray-collapsed', 'true');
    const thisPlayer = fakePublicPlayerModel({tableau: [{name: CardName.ACQUIRED_COMPANY}]});
    const waitingView = fakePlayerViewModel({thisPlayer, players: [thisPlayer], waitingFor: undefined});
    const wrapper = shallowMount(PlayerHome, {
      ...globalConfig,
      parentComponent: {methods: {getVisibilityState: () => true, setVisibilityState: () => {}}} as any,
      props: {playerView: waitingView},
    });

    expect(wrapper.classes()).to.include('tm-player-table--bottom-collapsed');
    await wrapper.setProps({
      playerView: {...waitingView, waitingFor: {type: 'option', title: 'Choose', buttonLabel: 'Continue'}},
    });
    expect(wrapper.classes()).not.to.include('tm-player-table--bottom-collapsed');
    expect(wrapper.find('.tm-action-workbench').exists()).to.eq(true);
    expect(wrapper.find('.tm-bottom-tray-toggle').attributes()).to.have.property('disabled');
    expect(localStorage.getItem('tm-player-table-bottom-tray-collapsed')).to.eq('true');

    await wrapper.setProps({playerView: waitingView});
    expect(wrapper.classes()).to.include('tm-player-table--bottom-collapsed');
  });

  it('uses one utility dock and one controlled module overlay', async () => {
    const thisPlayer = fakePublicPlayerModel({tableau: [{name: CardName.ACQUIRED_COMPANY}]});
    const otherPlayer = fakePublicPlayerModel({color: 'red', id: 'p-red-id', name: 'Red'});
    const wrapper = shallowMount(PlayerHome, {
      ...globalConfig,
      parentComponent: {methods: {getVisibilityState: () => true, setVisibilityState: () => {}}} as any,
      props: {playerView: fakePlayerViewModel({thisPlayer, players: [thisPlayer, otherPlayer]})},
    });

    expect(wrapper.findAll('.tm-top-tools > .tm-utility-control').length).to.eq(3);
    expect(wrapper.find('.tm-top-tools .tm-utility-menu').exists()).to.eq(true);
    expect(wrapper.find('.tm-control--board').exists()).to.eq(false);
    expect(wrapper.find('.tm-board-expand-button').exists()).to.eq(false);
    expect(wrapper.findAll('.tm-module-dock-button').length).to.eq(1);

    await wrapper.find('.tm-module-dock-button--ma').trigger('click');
    expect((wrapper.vm as any).activeOverlay).to.eq('module');
    expect((wrapper.vm as any).activeModule).to.eq('ma');
    expect(wrapper.find('.tm-modal--module').exists()).to.eq(true);
  });

  it('closes module overlays consistently, restores focus, and invalidates unavailable modules', async () => {
    const thisPlayer = fakePublicPlayerModel({tableau: [{name: CardName.ACQUIRED_COMPANY}]});
    const otherPlayer = fakePublicPlayerModel({color: 'red', id: 'p-red-id', name: 'Red'});
    const initialView = fakePlayerViewModel({thisPlayer, players: [thisPlayer, otherPlayer]});
    const wrapper = shallowMount(PlayerHome, {
      ...globalConfig,
      attachTo: document.body,
      parentComponent: {methods: {getVisibilityState: () => true, setVisibilityState: () => {}}} as any,
      props: {playerView: initialView},
    });
    const launcher = wrapper.find<HTMLButtonElement>('.tm-module-dock-button--ma');
    const vm = wrapper.vm as any;

    launcher.element.focus();
    await launcher.trigger('click');
    expect(vm.activeOverlay).to.eq('module');
    vm.handleGlobalKeydown({key: 'Escape', preventDefault: () => {}} as KeyboardEvent);
    await wrapper.vm.$nextTick();
    expect(vm.activeOverlay).to.eq('none');
    expect(document.activeElement).to.eq(launcher.element);

    await launcher.trigger('click');
    await wrapper.find('.tm-modal-backdrop').trigger('click');
    await wrapper.vm.$nextTick();
    expect(vm.activeOverlay).to.eq('none');

    await launcher.trigger('click');
    await wrapper.setProps({playerView: {...initialView, players: [thisPlayer]}});
    await wrapper.vm.$nextTick();
    expect(vm.activeOverlay).to.eq('none');
    expect(vm.activeModule).to.eq(undefined);
    wrapper.unmount();
  });

  it('resizes and persists the dossier split from its grab-time width', async () => {
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
    const vm = wrapper.vm as any;
    vm.playerDossierLogWidth = 420;
    const previousInnerWidth = window.innerWidth;
    Object.defineProperty(window, 'innerWidth', {configurable: true, value: 1600});

    vm.beginLayoutResize('dossier', {
      preventDefault: () => {},
      currentTarget: null,
      pointerId: 1,
      clientX: 900,
      clientY: 0,
    });
    expect(vm.playerDossierLogWidth).to.eq(420);

    vm.updateLayoutResize({clientX: 868, clientY: 0});
    expect(vm.playerDossierLogWidth).to.eq(452);
    await wrapper.vm.$nextTick();
    expect(wrapper.attributes('style')).to.contain('--tm-dossier-log-width: 452px');

    vm.stopLayoutResize();
    expect(localStorage.getItem('tm-player-table-dossier-log-width')).to.eq('452');
    Object.defineProperty(window, 'innerWidth', {configurable: true, value: previousInnerWidth});
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

  it('clears prior feedback on the next state change without surface deltas', () => {
    const playerView = fakePlayerViewModel();
    const wrapper = shallowMount(PlayerHome, {
      ...globalConfig,
      parentComponent: {
        methods: {getVisibilityState: () => true, setVisibilityState: () => {}},
      } as any,
      props: {playerView},
    });
    const vm = wrapper.vm as any;
    vm.resourceDeltas = [{
      playerColor: playerView.thisPlayer.color,
      playerName: playerView.thisPlayer.name,
      resource: Resource.MEGACREDITS,
      amount: 1,
      production: 0,
    }];
    vm.globalDeltas = [{parameter: 'temperature', amount: 2}];

    vm.applyActionFeedback({resources: [], globals: [], spaces: [], colonies: []});

    expect(vm.resourceDeltas).to.deep.eq([]);
    expect(vm.globalDeltas).to.deep.eq([]);
    expect(vm.feedbackSpaces).to.deep.eq([]);
    expect(vm.feedbackColonies).to.deep.eq([]);
    wrapper.unmount();
  });

  it('clears prior feedback when the active seat changes without a new game age', async () => {
    const alice = fakePublicPlayerModel({color: 'red', isActive: true});
    const bob = fakePublicPlayerModel({color: 'green', isActive: false});
    const initialView = fakePlayerViewModel({thisPlayer: alice, players: [alice, bob]});
    const wrapper = shallowMount(PlayerHome, {
      ...globalConfig,
      parentComponent: {
        methods: {getVisibilityState: () => true, setVisibilityState: () => {}},
      } as any,
      props: {playerView: initialView},
    });
    const vm = wrapper.vm as any;
    vm.resourceDeltas = [{
      playerColor: alice.color,
      playerName: alice.name,
      resource: Resource.MEGACREDITS,
      amount: 1,
      production: 0,
    }];

    await wrapper.setProps({
      playerView: {
        ...initialView,
        players: [
          {...alice, isActive: false},
          {...bob, isActive: true},
        ],
      },
    });

    expect(vm.resourceDeltas).to.deep.eq([]);
    wrapper.unmount();
  });
});
