import {shallowMount} from '@vue/test-utils';
import {expect} from 'chai';
import ActionSpotlight from '@/client/components/logpanel/ActionSpotlight.vue';
import {CardName} from '@/common/cards/CardName';
import {LogMessage} from '@/common/logs/LogMessage';
import {LogMessageDataType} from '@/common/logs/LogMessageDataType';
import {LogMessageType} from '@/common/logs/LogMessageType';
import {globalConfig} from '../getLocalVue';
import {fakeViewModel} from '../testHelpers';

describe('ActionSpotlight', () => {
  it('renders the complete action stack and keeps the played card as its preview', () => {
    const gained = new LogMessage(LogMessageType.DEFAULT, '${0} gained 2 energy production', []);
    const played = new LogMessage(LogMessageType.DEFAULT, '${0} played ${1}', [
      {type: LogMessageDataType.CARD, value: CardName.STRIP_MINE},
    ]);
    const lost = new LogMessage(LogMessageType.DEFAULT, '${0} lost 2 energy production', []);
    const wrapper = shallowMount(ActionSpotlight, {
      ...globalConfig,
      props: {
        messages: [gained, played, lost],
        viewModel: fakeViewModel(),
      },
    });

    expect(wrapper.findAllComponents({name: 'LogMessageComponent'})).to.have.length(3);
    expect(wrapper.findAllComponents({name: 'CardPanel'})).to.have.length(1);
    expect(wrapper.findComponent({name: 'CardPanel'}).props('message').message).to.equal(played.message);
    expect(wrapper.find('.tm-action-spotlight-content').classes()).to.include('tm-action-spotlight-content--visual-single');
  });

  it('shows the draw description together with all drawn cards', () => {
    const drew = new LogMessage(LogMessageType.DEFAULT, '${0} drew ${1}', [
      {type: LogMessageDataType.CARDS, value: [CardName.ALGAE, CardName.BIRDS, CardName.CELESTIC]},
    ]);
    const wrapper = shallowMount(ActionSpotlight, {
      ...globalConfig,
      props: {
        messages: [drew],
        viewModel: fakeViewModel(),
      },
    });

    expect(wrapper.findComponent({name: 'LogMessageComponent'}).props('message').message).to.equal(drew.message);
    expect(wrapper.findComponent({name: 'CardPanel'}).props('message').message).to.equal(drew.message);
    expect(wrapper.findComponent({name: 'CardPanel'}).props('cardOutcomes')).to.deep.eq(['Drawn', 'Drawn', 'Drawn']);
    expect(wrapper.find('.tm-action-spotlight-content').classes()).to.include('tm-action-spotlight-content--visual-stack');
  });

  it('shows the played card and a separately logged drawn card in one browser', () => {
    const played = new LogMessage(LogMessageType.DEFAULT, '${0} played ${1}', [
      {type: LogMessageDataType.CARD, value: CardName.SF_MEMORIAL},
    ]);
    const drew = new LogMessage(LogMessageType.DEFAULT, '${0} drew ${1}', [
      {type: LogMessageDataType.CARD, value: CardName.MINING_EXPEDITION},
    ]);
    const wrapper = shallowMount(ActionSpotlight, {
      ...globalConfig,
      props: {
        messages: [played, drew],
        viewModel: fakeViewModel(),
      },
    });

    expect(wrapper.findAllComponents({name: 'CardPanel'}).map((panel) => panel.props('message').message)).to.deep.eq([
      played.message,
      drew.message,
    ]);
    expect(wrapper.find('.tm-action-spotlight-content').classes()).to.include('tm-action-spotlight-content--visual-stack');
  });

  it('keeps early visuals when a grouped action contains more than six messages', () => {
    const played = new LogMessage(LogMessageType.DEFAULT, '${0} played ${1}', [
      {type: LogMessageDataType.CARD, value: CardName.SF_MEMORIAL},
    ]);
    const effects = Array.from({length: 6}, (_, index) => (
      new LogMessage(LogMessageType.DEFAULT, `${index + 1} effect resolved`, [])
    ));
    const drew = new LogMessage(LogMessageType.DEFAULT, '${0} drew ${1}', [
      {type: LogMessageDataType.CARD, value: CardName.MINING_EXPEDITION},
    ]);
    const wrapper = shallowMount(ActionSpotlight, {
      ...globalConfig,
      props: {
        messages: [played, ...effects, drew],
        viewModel: fakeViewModel(),
      },
    });

    expect(wrapper.findAllComponents({name: 'LogMessageComponent'})).to.have.length(8);
    expect(wrapper.findAllComponents({name: 'CardPanel'}).map((panel) => panel.props('message').message)).to.deep.eq([
      played.message,
      drew.message,
    ]);
  });

  it('uses the native overflow surface without a proxy range control', () => {
    const drew = new LogMessage(LogMessageType.DEFAULT, '${0} drew ${1}', [
      {type: LogMessageDataType.CARDS, value: [CardName.ALGAE, CardName.BIRDS]},
    ]);
    const wrapper = shallowMount(ActionSpotlight, {
      ...globalConfig,
      props: {
        messages: [drew],
        viewModel: fakeViewModel(),
      },
    });

    expect(wrapper.find('.tm-action-spotlight-object').exists()).to.eq(true);
    expect(wrapper.find('.tm-action-spotlight-scrollbar').exists()).to.eq(false);
    expect(wrapper.findComponent({name: 'CardPanel'}).exists()).to.eq(true);
    expect(wrapper.find('.tm-action-spotlight-expand').exists()).to.eq(false);
  });

  it('labels revealed cards as kept or discarded and does not duplicate the kept subset', () => {
    const played = new LogMessage(LogMessageType.DEFAULT, '${0} played ${1}', [
      {type: LogMessageDataType.CARD, value: CardName.SF_MEMORIAL},
    ]);
    const revealed = new LogMessage(LogMessageType.DEFAULT, '${0} revealed ${1}', [
      {type: LogMessageDataType.CARDS, value: [
        CardName.ALGAE,
        CardName.BIRDS,
        CardName.CELESTIC,
        CardName.MINING_EXPEDITION,
      ]},
    ]);
    const kept = new LogMessage(LogMessageType.DEFAULT, 'You drew ${0}', [
      {type: LogMessageDataType.CARDS, value: [CardName.BIRDS, CardName.MINING_EXPEDITION]},
    ]);
    const wrapper = shallowMount(ActionSpotlight, {
      ...globalConfig,
      props: {
        messages: [played, revealed, kept],
        viewModel: fakeViewModel(),
      },
    });

    const panels = wrapper.findAllComponents({name: 'CardPanel'});
    expect(panels).to.have.length(2);
    expect(panels[0].props('cardOutcomes')).to.deep.eq(['Played']);
    expect(panels[1].props('cardOutcomes')).to.deep.eq(['Discarded', 'Kept', 'Discarded', 'Kept']);
  });
});
