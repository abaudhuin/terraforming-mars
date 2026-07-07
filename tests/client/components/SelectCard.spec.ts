import {shallowMount} from '@vue/test-utils';
import {expect} from 'chai';
import {globalConfig} from './getLocalVue';
import SelectCard from '@/client/components/SelectCard.vue';
import {fakePlayerViewModel} from './testHelpers';
import {CardModel} from '@/common/models/CardModel';
import {CardName} from '@/common/cards/CardName';

describe('SelectCard', () => {
  it('mounts without errors', () => {
    const wrapper = shallowMount(SelectCard, {
      ...globalConfig,
      props: {
        playerView: fakePlayerViewModel(),
        playerinput: {
          title: 'Select a card',
          buttonLabel: 'Save',
          type: 'card',
          cards: [],
          max: 1,
          min: 1,
          showOnlyInLearnerMode: false,
          selectBlueCardAction: false,
          showOwner: false,
          showSelectAll: false,
        },
        onsave: () => {},
        showsave: true,
        showtitle: true,
      },
    });
    expect(wrapper.exists()).to.be.true;
  });

  it('does not dim a selected card whose action was already used', async () => {
    const cards = [
      {name: CardName.TARDIGRADES},
      {name: CardName.REGOLITH_EATERS},
    ] as Array<CardModel>;
    const wrapper = shallowMount(SelectCard, {
      ...globalConfig,
      props: {
        playerView: fakePlayerViewModel({
          thisPlayer: {
            actionsThisGeneration: [CardName.REGOLITH_EATERS],
          },
        }),
        playerinput: {
          title: 'Select card to add 5 Microbe',
          buttonLabel: 'Add resources',
          type: 'card',
          cards,
          max: 1,
          min: 1,
          showOnlyInLearnerMode: false,
          selectBlueCardAction: false,
          showOwner: false,
          showSelectAll: false,
        },
        onsave: () => {},
        showsave: true,
        showtitle: true,
      },
    });

    const cardComponents = wrapper.findAllComponents({name: 'Card'});
    expect(cardComponents[1].props('actionUsed')).to.eq(true);

    await wrapper.findAll('input[type="radio"]')[1].setValue();

    expect(cardComponents[1].props('actionUsed')).to.eq(false);
  });
});
