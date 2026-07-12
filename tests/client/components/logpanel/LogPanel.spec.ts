import {shallowMount} from '@vue/test-utils';
import {expect} from 'chai';
import {globalConfig} from '../getLocalVue';
import LogPanel from '@/client/components/logpanel/LogPanel.vue';
import {fakeViewModel} from '../testHelpers';
import {flushPromises} from '@vue/test-utils';
import {LogMessage} from '@/common/logs/LogMessage';
import {LogMessageType} from '@/common/logs/LogMessageType';

describe('LogPanel', () => {
  let originalFetch: any;

  beforeEach(() => {
    originalFetch = (global as any).fetch;
    (global as any).fetch = () => Promise.resolve({ok: false, status: 500, statusText: 'stubbed'});
  });

  afterEach(() => {
    (global as any).fetch = originalFetch;
  });

  it('mounts without errors', () => {
    const wrapper = shallowMount(LogPanel, {
      ...globalConfig,
      props: {
        viewModel: fakeViewModel(),
        color: 'blue',
      },
    });
    expect(wrapper.exists()).to.be.true;
    wrapper.unmount();
  });

  it('renders a custom title, generation buttons, and header actions on one row', async () => {
    const wrapper = shallowMount(LogPanel, {
      ...globalConfig,
      props: {
        viewModel: fakeViewModel(),
        color: 'blue',
        headerTitle: 'Logs',
      },
      slots: {
        'header-actions': '<button class="test-log-action">Open</button>',
      },
    });

    const header = wrapper.find('.log-generations');
    expect(header.find('.log-title').text()).to.eq('Logs');
    expect(header.find('.test-log-action').exists()).to.be.true;
    expect(header.findAll('button.log-gen-indicator')).to.not.be.empty;
    const generation = header.find('button.log-gen-indicator');
    await generation.trigger('click');
    expect(generation.attributes('aria-pressed')).to.eq('true');
    wrapper.unmount();
  });

  it('keeps requests and scroll containers independent across panel instances', () => {
    const calls: Array<{signal: AbortSignal}> = [];
    (global as any).fetch = (_url: string, options: {signal: AbortSignal}) => {
      calls.push(options);
      return new Promise(() => {});
    };
    const first = shallowMount(LogPanel, {
      ...globalConfig,
      props: {viewModel: fakeViewModel(), color: 'blue'},
    });
    const second = shallowMount(LogPanel, {
      ...globalConfig,
      props: {viewModel: fakeViewModel(), color: 'red'},
    });

    expect(calls).to.have.length(2);
    expect(calls[0].signal.aborted).to.be.false;
    expect(calls[1].signal.aborted).to.be.false;
    expect(first.find('#logpanel-scrollable').exists()).to.be.false;
    expect(second.find('#logpanel-scrollable').exists()).to.be.false;

    const firstPanel = first.find('.panel-body').element as HTMLElement;
    const secondPanel = second.find('.panel-body').element as HTMLElement;
    Object.defineProperty(firstPanel, 'scrollHeight', {configurable: true, value: 100});
    Object.defineProperty(secondPanel, 'scrollHeight', {configurable: true, value: 200});
    (first.vm as any).scrollToEnd();
    expect(firstPanel.scrollTop).to.equal(100);
    expect(secondPanel.scrollTop).to.equal(0);

    (first.vm as any).replaceMessages('/replacement', true);
    expect(calls[0].signal.aborted).to.be.true;
    expect(calls[1].signal.aborted).to.be.false;
    expect(calls[2].signal.aborted).to.be.false;
    first.unmount();
    expect(calls[2].signal.aborted).to.be.true;
    expect(calls[1].signal.aborted).to.be.false;
    second.unmount();
  });

  it('refreshes on game activity without resetting manual scroll', async () => {
    const responses: Array<(response: Response) => void> = [];
    (global as any).fetch = () => new Promise<Response>((resolve) => responses.push(resolve));
    const wrapper = shallowMount(LogPanel, {
      ...globalConfig,
      props: {viewModel: fakeViewModel(), color: 'blue', step: 0, gameAge: 0},
    });
    const panel = wrapper.find('.panel-body').element as HTMLElement;
    Object.defineProperty(panel, 'scrollHeight', {configurable: true, value: 100});
    Object.defineProperty(panel, 'clientHeight', {configurable: true, value: 20});
    panel.scrollTop = 10;

    responses.shift()!({
      ok: true,
      json: () => Promise.resolve([new LogMessage(LogMessageType.DEFAULT, 'initial', [])]),
    } as Response);
    await flushPromises();
    expect(panel.scrollTop).to.equal(10);

    await wrapper.setProps({gameAge: 1});
    expect(responses).to.have.length(1);
    panel.scrollTop = 12;
    responses.shift()!({
      ok: true,
      json: () => Promise.resolve([new LogMessage(LogMessageType.DEFAULT, 'updated', [])]),
    } as Response);
    await flushPromises();
    expect(panel.scrollTop).to.equal(12);

    panel.scrollTop = 80;
    await wrapper.setProps({gameAge: 2});
    responses.shift()!({
      ok: true,
      json: () => Promise.resolve([new LogMessage(LogMessageType.DEFAULT, 'latest', [])]),
    } as Response);
    await flushPromises();
    expect(panel.scrollTop).to.equal(100);
    wrapper.unmount();
  });

  it('limits compact history without changing the fetched log', async () => {
    (global as any).fetch = () => Promise.resolve({
      ok: true,
      json: () => Promise.resolve([
        new LogMessage(LogMessageType.DEFAULT, 'one', []),
        new LogMessage(LogMessageType.DEFAULT, 'two', []),
        new LogMessage(LogMessageType.DEFAULT, 'three', []),
      ]),
    });
    const wrapper = shallowMount(LogPanel, {
      ...globalConfig,
      props: {viewModel: fakeViewModel(), color: 'blue', messageLimit: 2},
    });
    await flushPromises();

    expect((wrapper.vm as any).messages).to.have.length(3);
    expect((wrapper.vm as any).visibleMessages.map((message: LogMessage) => message.message)).to.deep.eq(['two', 'three']);
    wrapper.unmount();
  });

  it('publishes a compact activity bundle for the focus view', async () => {
    const responses: Array<(response: Response) => void> = [];
    (global as any).fetch = () => new Promise<Response>((resolve) => responses.push(resolve));
    const wrapper = shallowMount(LogPanel, {
      ...globalConfig,
      props: {viewModel: fakeViewModel(), color: 'blue', step: 0, liveUpdates: true},
    });
    const messages = [
      new LogMessage(LogMessageType.DEFAULT, 'one', []),
      new LogMessage(LogMessageType.DEFAULT, 'two', []),
      new LogMessage(LogMessageType.DEFAULT, 'three', []),
      new LogMessage(LogMessageType.DEFAULT, 'four', []),
      new LogMessage(LogMessageType.DEFAULT, 'five', []),
    ];

    responses.shift()!({ok: true, json: () => Promise.resolve(messages)} as Response);
    await flushPromises();

    const activityUpdate = wrapper.emitted('activity-update');
    expect(activityUpdate).to.have.length(1);
    expect((activityUpdate![0][0] as any).messages.map((message: LogMessage) => message.message)).to.deep.eq(['one', 'two', 'three', 'four', 'five']);
    expect((activityUpdate![0][0] as any).isInitial).to.be.true;
    wrapper.unmount();
  });
});
