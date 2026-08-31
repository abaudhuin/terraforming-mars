import {mount, shallowMount} from '@vue/test-utils';
import {expect} from 'chai';
import {globalConfig} from './getLocalVue';
import SelectSpace from '@/client/components/SelectSpace.vue';
import {FakeLocalStorage} from './FakeLocalStorage';
import {PlayerViewModel} from '@/common/models/PlayerModel';
import {PreferencesManager} from '@/client/utils/PreferencesManager';
import ConfirmDialog from '@/client/components/common/ConfirmDialog.vue';

describe('SelectSpace', () => {
  let localStorage: FakeLocalStorage;

  beforeEach(() => {
    localStorage = new FakeLocalStorage();
    FakeLocalStorage.register(localStorage);
    PreferencesManager.resetForTest();
  });

  afterEach(() => {
    document.getElementById('main_board')?.remove();
    FakeLocalStorage.deregister(localStorage);
    PreferencesManager.resetForTest();
  });

  it('mounts without errors', () => {
    const wrapper = shallowMount(SelectSpace, {
      ...globalConfig,
      props: {
        playerView: {} as PlayerViewModel,
        playerinput: {
          title: 'Select a space',
          buttonLabel: 'Save',
          type: 'space',
          spaces: [],
        },
        onsave: () => {},
        showsave: true,
        showtitle: true,
      },
    });
    expect(wrapper.exists()).to.be.true;
  });

  function addSelectableSpace(): HTMLElement {
    const board = document.createElement('div');
    board.id = 'main_board';
    board.innerHTML = '<button class="board-space-selectable" data_space_id="01"></button>';
    document.body.appendChild(board);
    return board.firstElementChild as HTMLElement;
  }

  function mountInput(onsave: (response: unknown) => void) {
    return mount(SelectSpace, {
      ...globalConfig,
      props: {
        playerView: {} as PlayerViewModel,
        playerinput: {
          title: 'Convert 8 plants into greenery',
          buttonLabel: 'Save',
          type: 'space',
          spaces: ['01'],
        },
        onsave,
        showsave: true,
        showtitle: true,
      },
    });
  }

  it('commits a plant-conversion space after visible confirmation', async () => {
    const tile = addSelectableSpace();
    const saved: unknown[] = [];
    const wrapper = mountInput((response) => saved.push(response));
    const confirmation = wrapper.findComponent(ConfirmDialog);
    let shown = 0;
    (confirmation.vm as any).show = () => shown++;

    tile.click();
    expect(shown).to.eq(1);
    expect(saved).to.deep.eq([]);

    confirmation.vm.$emit('accept');
    await wrapper.vm.$nextTick();
    expect(saved).to.deep.eq([{type: 'space', spaceId: '01'}]);
    wrapper.unmount();
  });

  it('restores every eligible space when placement confirmation is dismissed', async () => {
    const tile = addSelectableSpace();
    const wrapper = mountInput(() => {});
    const confirmation = wrapper.findComponent(ConfirmDialog);
    (confirmation.vm as any).show = () => {};

    tile.click();
    expect(tile.classList.contains('board-space--available')).to.be.false;
    confirmation.vm.$emit('dismiss');
    await wrapper.vm.$nextTick();
    expect(tile.classList.contains('board-space--available')).to.be.true;
    wrapper.unmount();
  });

  it('commits immediately when tile confirmation is disabled', () => {
    PreferencesManager.INSTANCE.set('hide_tile_confirmation', true);
    const tile = addSelectableSpace();
    const saved: unknown[] = [];
    const wrapper = mountInput((response) => saved.push(response));

    tile.click();
    expect(saved).to.deep.eq([{type: 'space', spaceId: '01'}]);
    wrapper.unmount();
  });
});
