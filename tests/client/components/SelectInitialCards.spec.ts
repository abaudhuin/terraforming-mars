import {mount, VueWrapper} from '@vue/test-utils';
import {globalConfig} from './getLocalVue';
import {expect} from 'chai';
import {CardName} from '@/common/cards/CardName';
import SelectInitialCards from '@/client/components/SelectInitialCards.vue';
import {SelectInitialCardsResponse, InputResponse} from '@/common/inputs/InputResponse';
import ConfirmDialog from '@/client/components/common/ConfirmDialog.vue';
import {Preferences} from '@/client/utils/PreferencesManager';
import * as titles from '@/common/inputs/SelectInitialCards';
import {SelectCardModel} from '@/common/models/PlayerInputModel';
import {CardModel} from '@/common/models/CardModel';
import {MulliganCategory} from '@/common/game/Mulligan';

let savedData: InputResponse | undefined;

describe('SelectInitialCards', () => {
  beforeEach(() => {
    savedData = undefined;
  });

  it('saves data without prelude', async () => {
    const component = createComponent([CardName.ECOLINE], [CardName.ANTS]);
    expect(component).not.is.undefined;

    const button = getButton(component);
    expect(button.attributes().disabled).not.to.be.undefined;

    const selectCards = component.findAllComponents({name: 'select-card'});
    expect(selectCards).has.length(2);
    selectCards[0].vm.$emit('cardschanged', [CardName.ECOLINE]);

    await component.vm.$nextTick();
    expect(button.attributes().disabled).is.undefined;

    selectCards[1].vm.$emit('cardschanged', [CardName.ANTS]);
    await component.vm.$nextTick();

    await button.trigger('click');

    expect(savedData).to.deep.eq({type: 'initialCards', responses: [
      {type: 'card', cards: [CardName.ECOLINE]},
      {type: 'card', cards: [CardName.ANTS]},
    ]});
  });

  it('Cannot save with only one prelude', async () => {
    const component = createComponent([CardName.ECOLINE], [CardName.ANTS], [CardName.ALLIED_BANK]);
    expect(component).not.is.undefined;

    const selectCards = component.findAllComponents({name: 'select-card'});
    expect(selectCards).has.length(3);
    selectCards[0].vm.$emit('cardschanged', [CardName.ECOLINE]);
    selectCards[1].vm.$emit('cardschanged', [CardName.ALLIED_BANK]);
    selectCards[2].vm.$emit('cardschanged', [CardName.ANTS]);
    await component.vm.$nextTick();

    const button = getButton(component);
    expect(button.attributes().disabled).not.to.be.undefined;
  });

  it('saves data with prelude', async () => {
    const component = createComponent(
      [CardName.ECOLINE],
      [CardName.ANTS],
      [CardName.ALLIED_BANK, CardName.SUPPLY_DROP]);
    expect(component).not.is.undefined;

    const button = getButton(component);
    expect(button.attributes().disabled).not.to.be.undefined;

    const selectCards = component.findAllComponents({name: 'select-card'});
    expect(selectCards).has.length(3);

    selectCards[0].vm.$emit('cardschanged', [CardName.ECOLINE]);
    await component.vm.$nextTick();
    expect(button.attributes().disabled).not.to.be.undefined;

    selectCards[1].vm.$emit('cardschanged', [CardName.ALLIED_BANK, CardName.SUPPLY_DROP]);

    await component.vm.$nextTick();
    expect(button.attributes().disabled).is.undefined;

    selectCards[2].vm.$emit('cardschanged', [CardName.ANTS]);
    await component.vm.$nextTick();

    await button.trigger('click');

    expect(savedData).to.deep.eq({type: 'initialCards', responses: [
      {type: 'card', cards: [CardName.ECOLINE]},
      {type: 'card', cards: [CardName.ALLIED_BANK, CardName.SUPPLY_DROP]},
      {type: 'card', cards: [CardName.ANTS]},
    ]});

    await component.vm.$nextTick();
    const confirmationDialog = component.vm.$refs.confirmation as InstanceType<typeof ConfirmDialog>;
    expect(confirmationDialog.$data.shown).is.false;
  });

  it('shows error when no project cards selected', async () => {
    const component = createComponent([CardName.ECOLINE], [CardName.ANTS]);
    const selectCards = component.findAllComponents({name: 'select-card'});
    selectCards[0].vm.$emit('cardschanged', [CardName.ECOLINE]);
    await component.vm.$nextTick();

    const button = getButton(component);
    await button.trigger('click');

    expect(savedData).is.undefined;

    await component.vm.$nextTick();
    const confirmationDialog = getConfirmDialog(component);
    expect(confirmationDialog.$data.shown).is.true;
  });

  it('shows error when prelude cards are selected but not project cards', async () => {
    const component = createComponent(
      [CardName.ECOLINE],
      [CardName.ANTS],
      [CardName.ALLIED_BANK, CardName.SUPPLY_DROP]);

    const selectCards = component.findAllComponents({name: 'select-card'});
    selectCards[0].vm.$emit('cardschanged', [CardName.ECOLINE]);
    selectCards[1].vm.$emit('cardschanged', [CardName.ALLIED_BANK, CardName.SUPPLY_DROP]);
    await component.vm.$nextTick();
    const button = getButton(component);
    await button.trigger('click');
    expect(savedData).is.undefined;

    await component.vm.$nextTick();
    const confirmationDialog = getConfirmDialog(component);
    expect(confirmationDialog.$data.shown).is.true;
  });

  it('Cannot select two ceos', async () => {
    const component = createComponent([CardName.ECOLINE], [CardName.ANTS], undefined, [CardName.FLOYD, CardName.HAL9000, CardName.ENDER]);
    expect(component).not.is.undefined;

    const selectCards = component.findAllComponents({name: 'select-card'});
    expect(selectCards).has.length(3);
    selectCards[0].vm.$emit('cardschanged', [CardName.ECOLINE]);
    selectCards[1].vm.$emit('cardschanged', [CardName.FLOYD, CardName.HAL9000]);
    selectCards[2].vm.$emit('cardschanged', [CardName.ANTS]);
    await component.vm.$nextTick();

    const button = getButton(component);
    expect(button.attributes().disabled).not.to.be.undefined;
  });

  it('shows contextual mulligan actions and sends the selected category', async () => {
    const component = createComponent(
      [CardName.ECOLINE, CardName.HELION],
      [CardName.ANTS, CardName.COMET_AIMING, CardName.DIRIGIBLES],
      undefined,
      undefined,
      ['corporation', 'project']);

    const mulliganButtons = component.findAll('.initial-card-mulligan__button');
    expect(mulliganButtons).has.length(2);
    expect(mulliganButtons[0].text()).contains('2 → 1');
    expect(mulliganButtons[1].text()).contains('3 → 2');

    await mulliganButtons[1].trigger('click');
    expect(savedData).to.deep.eq({type: 'initialCardsMulligan', category: 'project'});
  });

  it('clears only the redrawn pool and preserves unrelated setup choices', async () => {
    const component = createComponent(
      [CardName.ECOLINE, CardName.HELION],
      [CardName.ANTS, CardName.COMET_AIMING, CardName.DIRIGIBLES],
      [CardName.ALLIED_BANK, CardName.SUPPLY_DROP],
      [CardName.FLOYD, CardName.HAL9000],
      ['project']);
    const selectCards = component.findAllComponents({name: 'select-card'});

    selectCards[0].vm.$emit('cardschanged', [CardName.ECOLINE]);
    selectCards[1].vm.$emit('cardschanged', [CardName.ALLIED_BANK, CardName.SUPPLY_DROP]);
    selectCards[2].vm.$emit('cardschanged', [CardName.FLOYD]);
    selectCards[3].vm.$emit('cardschanged', [CardName.ANTS]);
    await component.vm.$nextTick();

    await component.find('.initial-card-mulligan__button').trigger('click');

    expect(component.vm.selectedCorporations).to.deep.eq([CardName.ECOLINE]);
    expect(component.vm.selectedPreludes).to.deep.eq([CardName.ALLIED_BANK, CardName.SUPPLY_DROP]);
    expect(component.vm.selectedCeos).to.deep.eq([CardName.FLOYD]);
    expect(component.vm.selectedCards).to.deep.eq([]);
    expect(savedData).to.deep.eq({type: 'initialCardsMulligan', category: 'project'});
  });
});

function getButton(component: VueWrapper<InstanceType<typeof SelectInitialCards>>) {
  return component.findAllComponents({name: 'AppButton'})[0];
}

function getConfirmDialog(component: VueWrapper<InstanceType<typeof SelectInitialCards>>): InstanceType<typeof ConfirmDialog> {
  return component.vm.$refs.confirmation as InstanceType<typeof ConfirmDialog>;
}

function createComponent(corpCards: Array<CardName>, projectCards: Array<CardName>, preludeCards?: Array<CardName>, ceoCards?: Array<CardName>, mulliganCategories: Array<MulliganCategory> = []) {
  const toObject = (cards: Array<CardName>) => cards.map((name) => {
    return {name} as CardModel;
  });
  const options: Array<SelectCardModel> = [{
    type: 'card',
    title: titles.SELECT_CORPORATION_TITLE,
    buttonLabel: 'x',
    cards: toObject(corpCards),
    max: 1,
    min: 1,
    showOnlyInLearnerMode: false,
    selectBlueCardAction: false,
    showOwner: false,
    showSelectAll: false,
  }, {
    type: 'card',
    title: titles.SELECT_PROJECTS_TITLE,
    buttonLabel: 'x',
    cards: toObject(projectCards),
    max: projectCards.length,
    min: 1,
    showOnlyInLearnerMode: false,
    selectBlueCardAction: false,
    showOwner: false,
    showSelectAll: false,
  }];

  if (preludeCards) {
    options.splice(1, 0, {
      type: 'card',
      title: titles.SELECT_PRELUDE_TITLE,
      buttonLabel: 'x',
      cards: toObject(preludeCards),
      max: 2,
      min: 2,
      showOnlyInLearnerMode: false,
      selectBlueCardAction: false,
      showOwner: false,
      showSelectAll: false,
    });
  }
  if (ceoCards) {
    options.push({
      type: 'card',
      title: titles.SELECT_CEO_TITLE,
      buttonLabel: 'x',
      cards: toObject(ceoCards),
      max: 1,
      min: 1,
      showOnlyInLearnerMode: false,
      selectBlueCardAction: false,
      showOwner: false,
      showSelectAll: false,
    });
  }

  return mount(SelectInitialCards, {
    ...globalConfig,
    props: {
      playerView: {
        id: 'foo',
        dealtCorporationCards: [],
        thisPlayer: {actionsThisGeneration: []},
        game: {},
      },
      playerinput: {
        title: 'selectInitialCards',
        options,
        mulliganCategories,
      },
      onsave: function(data: SelectInitialCardsResponse) {
        savedData = data;
      },
      showsave: true,
      preferences: {
        show_alerts: true,
      } as Readonly<Preferences>,
    },
  });
}
