import {expect} from 'chai';
import {testGame} from '../TestGame';
import {SelectInitialCards} from '../../src/server/inputs/SelectInitialCards';
import {TestPlayer} from '../TestPlayer';
import {CardName} from '../../src/common/cards/CardName';
import {ICorporationCard} from '../../src/server/cards/corporation/ICorporationCard';
import {cardsFromJSON, ceosFromJSON, corporationCardsFromJSON, preludesFromJSON} from '../../src/server/createCard';
import {toName} from '../../src/common/utils/utils';

describe('SelectInitialCards', () => {
  let player: TestPlayer;
  let corp: ICorporationCard | undefined = undefined;
  let selectInitialCards: SelectInitialCards;

  function cb(corporation: ICorporationCard) {
    corp = corporation;
    return undefined;
  }

  beforeEach(() => {
    [/* game */, player] = testGame(1);
    player.dealtCorporationCards = corporationCardsFromJSON([CardName.INVENTRIX, CardName.HELION]);
    player.dealtProjectCards = cardsFromJSON([CardName.ANTS, CardName.BACTOVIRAL_RESEARCH, CardName.COMET_AIMING, CardName.DIRIGIBLES]);
    selectInitialCards = new SelectInitialCards(player, cb);
  });

  it('fail, no corporations', () => {
    expect(() =>
      selectInitialCards.process({type: 'initialCards', responses: [
        {type: 'card', cards: []},
        {type: 'card', cards: []},
      ]}, player))
      .to.throw(/Not enough cards selected/);
  });

  it('fail, invalid corporation', () => {
    expect(() =>
      selectInitialCards.process({type: 'initialCards', responses: [
        {type: 'card', cards: [CardName.THARSIS_REPUBLIC]},
        {type: 'card', cards: []},
      ]}, player))
      .to.throw(/Card Tharsis Republic not found/);
  });

  it('fail, too many corporations', () => {
    expect(() =>
      selectInitialCards.process({type: 'initialCards', responses: [
        {type: 'card', cards: [CardName.INVENTRIX, CardName.HELION]},
        {type: 'card', cards: []},
      ]}, player))
      .to.throw(/Too many cards selected/);
  });

  it('Simple', () => {
    player.game.projectDeck.discardPile.length = 0; // Emptying the discard pile, which has 4 cards setting up the solo opponent.
    // player.game.corporationDeck.discardPile.length = 0;

    selectInitialCards.process({type: 'initialCards', responses: [
      {type: 'card', cards: [CardName.INVENTRIX]},
      {type: 'card', cards: [CardName.ANTS]},
    ]}, player);

    expect(player.playedCards.corporations()).is.empty; // This input object doesn't set the player's corporation card
    expect(corp!.name).eq(CardName.INVENTRIX);
    expect(player.cardsInHand.map(toName)).to.have.members([CardName.ANTS]); // But it does set their cards in hand.

    expect(player.game.projectDeck.discardPile.map(toName)).to.have.members([CardName.BACTOVIRAL_RESEARCH, CardName.COMET_AIMING, CardName.DIRIGIBLES]);
    expect(player.game.corporationDeck.discardPile.map(toName)).to.have.members([CardName.HELION]);
  });

  it('Full', () => {
    const [/* game */, player] = testGame(1, {ceoExtension: true, preludeExtension: true});
    player.game.projectDeck.discardPile.length = 0; // Emptying the discard pile, which has 4 cards setting up the solo opponent.
    player.game.corporationDeck.discardPile.length = 0;
    player.dealtCorporationCards = corporationCardsFromJSON([CardName.INVENTRIX, CardName.HELION]);
    player.dealtProjectCards = cardsFromJSON([CardName.ANTS, CardName.BACTOVIRAL_RESEARCH, CardName.COMET_AIMING, CardName.DIRIGIBLES]);
    player.dealtPreludeCards = preludesFromJSON([CardName.LOAN, CardName.BIOLAB, CardName.DONATION, CardName.SUPPLIER]);
    player.dealtCeoCards = ceosFromJSON([CardName.ASIMOV, CardName.MUSK]);
    selectInitialCards = new SelectInitialCards(player, cb);

    selectInitialCards.process({type: 'initialCards', responses: [
      {type: 'card', cards: [CardName.INVENTRIX]},
      {type: 'card', cards: [CardName.LOAN, CardName.BIOLAB]},
      {type: 'card', cards: [CardName.ASIMOV]},
      {type: 'card', cards: [CardName.ANTS]},
    ]}, player);

    expect(player.playedCards.corporations()).is.empty; // This input object doesn't set the player's corporation card
    expect(corp!.name).eq(CardName.INVENTRIX);
    expect(player.cardsInHand.map(toName)).to.have.members([CardName.ANTS]); // But it does set their cards in hand.
    expect(Array.from(player.ceoCardsInHand).map(toName)).to.have.members([CardName.ASIMOV]);
    expect(player.preludeCardsInHand.map(toName)).to.have.members([CardName.LOAN, CardName.BIOLAB]);

    expect(player.game.projectDeck.discardPile.map(toName)).to.have.members([CardName.BACTOVIRAL_RESEARCH, CardName.COMET_AIMING, CardName.DIRIGIBLES]);
    expect(player.game.corporationDeck.discardPile.map(toName)).to.have.members([CardName.HELION]);
    expect(player.game.ceoDeck.discardPile.map(toName)).to.have.members([CardName.MUSK]);
    expect(player.game.preludeDeck.discardPile.map(toName)).to.have.members([CardName.DONATION, CardName.SUPPLIER]);
  });

  for (const testCase of [
    {category: 'project' as const, from: 4, to: 3},
    {category: 'corporation' as const, from: 2, to: 1},
    {category: 'prelude' as const, from: 4, to: 3},
    {category: 'ceo' as const, from: 2, to: 1},
  ]) {
    it(`mulligans ${testCase.category} cards once and draws one fewer`, () => {
      const [game, player] = testGame(1, {
        ceoExtension: true,
        preludeExtension: true,
        mulligan: {project: true, corporation: true, prelude: true, ceo: true},
      });
      player.dealtCorporationCards = corporationCardsFromJSON([CardName.INVENTRIX, CardName.HELION]);
      player.dealtProjectCards = cardsFromJSON([CardName.ANTS, CardName.BACTOVIRAL_RESEARCH, CardName.COMET_AIMING, CardName.DIRIGIBLES]);
      player.dealtPreludeCards = preludesFromJSON([CardName.LOAN, CardName.BIOLAB, CardName.DONATION, CardName.SUPPLIER]);
      player.dealtCeoCards = ceosFromJSON([CardName.ASIMOV, CardName.MUSK]);
      const input = new SelectInitialCards(player, cb);
      const oldNames = poolNames(player, testCase.category);
      removeNamesFromDrawPile(game, testCase.category, oldNames);

      input.process({type: 'initialCardsMulligan', category: testCase.category}, player);

      const newNames = poolNames(player, testCase.category);
      expect(oldNames).to.have.length(testCase.from);
      expect(newNames).to.have.length(testCase.to);
      expect(newNames.some((name) => oldNames.includes(name))).is.false;
      expect(player.mulliganedCategories.has(testCase.category)).is.true;
      expect(input.toModel(player).mulliganCategories).not.to.include(testCase.category);
      expect(game.gameLog[game.gameLog.length - 1]?.message).eq('${0} took a mulligan and redrew ${1} ${2}');
      expect(() => input.process({type: 'initialCardsMulligan', category: testCase.category}, player))
        .to.throw(`Mulligan is not available for ${testCase.category} cards`);
    });
  }

  it('does not expose disabled mulligan categories', () => {
    const [/* game */, player] = testGame(1, {mulligan: {project: true, corporation: false, prelude: false, ceo: false}});
    const input = new SelectInitialCards(player, cb);
    expect(input.toModel(player).mulliganCategories).to.deep.eq(['project']);
  });

  it('preserves the mandatory Merger Prelude during a mulligan', () => {
    const [/* game */, player] = testGame(1, {
      preludeExtension: true,
      twoCorpsVariant: true,
      mulligan: {project: false, corporation: false, prelude: true, ceo: false},
    });
    player.dealtPreludeCards = preludesFromJSON([CardName.LOAN, CardName.BIOLAB, CardName.DONATION, CardName.SUPPLIER]);
    const input = new SelectInitialCards(player, cb);
    expect(player.dealtPreludeCards.map(toName)).to.include(CardName.MERGER);

    input.process({type: 'initialCardsMulligan', category: 'prelude'}, player);

    expect(player.dealtPreludeCards).to.have.length(4);
    expect(player.dealtPreludeCards.map(toName)).to.include(CardName.MERGER);
  });
});

function poolNames(player: TestPlayer, category: 'project' | 'corporation' | 'prelude' | 'ceo'): Array<CardName> {
  switch (category) {
  case 'project': return player.dealtProjectCards.map(toName);
  case 'corporation': return player.dealtCorporationCards.map(toName);
  case 'prelude': return player.dealtPreludeCards.map(toName);
  case 'ceo': return player.dealtCeoCards.map(toName);
  }
}

function removeNamesFromDrawPile(game: TestPlayer['game'], category: 'project' | 'corporation' | 'prelude' | 'ceo', names: Array<CardName>): void {
  switch (category) {
  case 'project': game.projectDeck.drawPile = game.projectDeck.drawPile.filter((card) => !names.includes(card.name)); break;
  case 'corporation': game.corporationDeck.drawPile = game.corporationDeck.drawPile.filter((card) => !names.includes(card.name)); break;
  case 'prelude': game.preludeDeck.drawPile = game.preludeDeck.drawPile.filter((card) => !names.includes(card.name)); break;
  case 'ceo': game.ceoDeck.drawPile = game.ceoDeck.drawPile.filter((card) => !names.includes(card.name)); break;
  }
}
