import {shallowMount} from '@vue/test-utils';
import {expect} from 'chai';
import {globalConfig} from './getLocalVue';
import SelectCard from '@/client/components/SelectCard.vue';
import {fakePlayerViewModel} from './testHelpers';
import {CardModel} from '@/common/models/CardModel';
import {CardName} from '@/common/cards/CardName';
import {LogMessageDataType} from '@/common/logs/LogMessageDataType';

describe('SelectCard', () => {
  it('marks selected cards with the shared selectable-card state', async () => {
    const card = {name: CardName.TARDIGRADES} as CardModel;
    const wrapper = shallowMount(SelectCard, {
      ...globalConfig,
      props: {
        playerView: fakePlayerViewModel(),
        playerinput: {
          type: 'card',
          title: 'Select a card',
          buttonLabel: 'Select',
          cards: [card],
          min: 1,
          max: 1,
          selectBlueCardAction: false,
          showOwner: false,
        },
        onsave: () => {},
      },
    });

    const label = wrapper.find('label.tm-selectable-card');
    expect(label.classes()).not.to.include('tm-selectable-card--selected');

    await label.find('input').setValue(true);

    expect(label.classes()).to.include('tm-selectable-card--selected');
  });

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

  it('uses Buy 0 as the only zero-card purchase action', () => {
    const wrapper = shallowMount(SelectCard, {
      ...globalConfig,
      props: {
        playerView: fakePlayerViewModel({
          thisPlayer: {
            cardCost: 3,
            megacredits: 10,
          },
        }),
        playerinput: {
          title: 'Buy cards',
          buttonLabel: 'Buy',
          type: 'card',
          cards: [],
          max: 4,
          min: 0,
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

    const buttons = wrapper.findAllComponents({name: 'AppButton'});
    expect(buttons).to.have.length(1);
    expect(buttons[0].props('title')).to.deep.equal({
      message: 'Buy ${0}',
      data: [{type: LogMessageDataType.RAW_STRING, value: '0'}],
    });
  });
});
