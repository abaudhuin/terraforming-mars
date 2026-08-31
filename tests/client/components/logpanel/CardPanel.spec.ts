import {shallowMount} from '@vue/test-utils';
import {expect} from 'chai';
import {globalConfig} from '../getLocalVue';
import CardPanel from '@/client/components/logpanel/CardPanel.vue';
import {LogMessage} from '@/common/logs/LogMessage';
import {LogMessageType} from '@/common/logs/LogMessageType';
import {LogMessageDataType} from '@/common/logs/LogMessageDataType';
import {CardName} from '@/common/cards/CardName';

describe('CardPanel', () => {
  it('mounts without errors', () => {
    const wrapper = shallowMount(CardPanel, {
      ...globalConfig,
      props: {
        message: new LogMessage(LogMessageType.DEFAULT, '', []),
        players: [],
      },
    });
    expect(wrapper.exists()).to.be.true;
  });

  it('renders explicit card outcomes as readable state markers', () => {
    const message = new LogMessage(LogMessageType.DEFAULT, 'revealed cards', [{
      type: LogMessageDataType.CARDS,
      value: [CardName.ALGAE, CardName.BIRDS],
    }]);
    const wrapper = shallowMount(CardPanel, {
      ...globalConfig,
      props: {
        message,
        players: [],
        showClose: false,
        cardOutcomes: ['Kept', 'Discarded'],
      },
    });

    expect(wrapper.findAll('.tm-card-outcome').map((marker) => marker.text())).to.deep.eq(['Kept', 'Discarded']);
    expect(wrapper.findAll('.log-panel-card').map((card) => card.attributes('data-card-outcome'))).to.deep.eq(['kept', 'discarded']);
  });
});
