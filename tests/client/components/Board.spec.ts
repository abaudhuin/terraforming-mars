import {shallowMount} from '@vue/test-utils';
import {globalConfig} from './getLocalVue';
import {expect} from 'chai';
import Board from '@/client/components/Board.vue';
import BoardSpace from '@/client/components/BoardSpace.vue';
import {SpaceModel} from '@/common/models/SpaceModel';
import {SpaceType} from '@/common/boards/SpaceType';
import {DEFAULT_EXPANSIONS} from '@/common/cards/GameModule';
import {BoardName} from '@/common/boards/BoardName';
import {GlobalParameter} from '@/common/GlobalParameter';

const spaces: SpaceModel[] = [
  {
    id: '01',
    x: 1,
    y: 1,
    bonus: [],
    spaceType: SpaceType.COLONY,
    color: undefined,
    highlight: undefined,
    tileType: undefined,
  },
  {
    id: '02',
    x: 2,
    y: 1,
    bonus: [],
    spaceType: SpaceType.COLONY,
    color: undefined,
    highlight: undefined,
    tileType: undefined,
  },
  {
    id: '69',
    x: 3,
    y: 1,
    bonus: [],
    spaceType: SpaceType.COLONY,
    color: undefined,
    highlight: undefined,
    tileType: undefined,
  },
  {
    id: '04',
    x: 3,
    y: 1,
    bonus: [],
    spaceType: SpaceType.OCEAN,
    color: undefined,
    highlight: undefined,
    tileType: undefined,
  },
];


describe('Board', () => {
  it('has visible tiles on the board', () => {
    const wrapper = shallowMount(Board, {
      ...globalConfig,
      props: {spaces, expansions: DEFAULT_EXPANSIONS, tileView: 'hide', venusScaleLevel: 0, boardName: BoardName.THARSIS},
    });

    const boardSpacesWrappers = wrapper.findAllComponents(BoardSpace).filter((wrapper) => {
      return wrapper.attributes('data-test') === 'board-space';
    });

    expect(
      boardSpacesWrappers.every((wrapper) => wrapper.props('tileView') === 'hide'),
    ).to.be.true;
  });

  it('has hidden tiles on the board', () => {
    const wrapper = shallowMount(Board, {
      ...globalConfig,
      props: {spaces, expansions: DEFAULT_EXPANSIONS, tileView: 'show', venusScaleLevel: 0, boardName: BoardName.THARSIS},
    });

    const boardSpacesWrappers = wrapper.findAllComponents(BoardSpace).filter((wrapper) => {
      return wrapper.attributes('data-test') === 'board-space';
    });

    expect(
      boardSpacesWrappers.every((wrapper) => wrapper.props('tileView') === 'show'),
    ).to.be.true;
  });

  it('emits toggleTileView on toggle button click', async () => {
    const wrapper = shallowMount(Board, {
      ...globalConfig,
      props: {spaces, expansions: DEFAULT_EXPANSIONS, venusScaleLevel: 0, boardName: BoardName.THARSIS},
    });

    await wrapper.find('[data-test=hide-tiles-button]').trigger('click');
    expect(wrapper.emitted('toggleTileView')?.length).to.be.eq(1);
  });

  it('renders "show tiles" in toggle button if tiles are hidden', () => {
    const wrapper = shallowMount(Board, {
      ...globalConfig,
      props: {spaces, expansions: DEFAULT_EXPANSIONS, tileView: 'show', venusScaleLevel: 0, boardName: BoardName.THARSIS},
    });

    expect(wrapper.find('[data-test=hide-tiles-button]').text()).to.be.eq('show tiles');
  });

  it('renders "hide tiles" in toggle button if tiles are visible', () => {
    const wrapper = shallowMount(Board, {
      ...globalConfig,
      props: {spaces, expansions: DEFAULT_EXPANSIONS, tileView: 'hide', venusScaleLevel: 0, boardName: BoardName.THARSIS},
    });

    expect(wrapper.find('[data-test=hide-tiles-button]').text()).to.be.eq('hide tiles');
  });

  it('anchors feedback on each changed global parameter', () => {
    const expansions = {...DEFAULT_EXPANSIONS, venus: true};
    const wrapper = shallowMount(Board, {
      ...globalConfig,
      props: {
        spaces,
        expansions,
        venusScaleLevel: 12,
        oxygen_level: 8,
        temperature: -10,
        oceans_count: 5,
        boardName: BoardName.THARSIS,
        globalDeltas: [
          {parameter: GlobalParameter.TEMPERATURE, amount: 2},
          {parameter: GlobalParameter.OXYGEN, amount: 1},
          {parameter: GlobalParameter.OCEANS, amount: 1},
          {parameter: GlobalParameter.VENUS, amount: 2},
        ],
      },
    });

    const changes = wrapper.findAll('.tm-global-change');
    expect(changes).to.have.length(4);
    expect(wrapper.find('.global-numbers-temperature .val-is-active .tm-global-change').text()).to.eq('+2');
    expect(wrapper.find('.global-numbers-oxygen .val-is-active .tm-global-change').text()).to.eq('+1');
    expect(wrapper.find('.global-numbers-venus .val-is-active .tm-global-change').text()).to.eq('+2');
    expect(wrapper.find('.global-numbers-oceans .tm-global-change').text()).to.eq('+1');
  });
});
