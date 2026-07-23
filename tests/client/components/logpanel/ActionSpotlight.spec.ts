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
    expect(wrapper.find('.tm-action-spotlight-content').classes()).to.include('tm-action-spotlight-content--visual-stack');
  });
});
