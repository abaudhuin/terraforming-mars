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

  it('refreshes on step changes without resetting manual scroll', async () => {
    const responses: Array<(response: Response) => void> = [];
    (global as any).fetch = () => new Promise<Response>((resolve) => responses.push(resolve));
    const wrapper = shallowMount(LogPanel, {
      ...globalConfig,
      props: {viewModel: fakeViewModel(), color: 'blue', step: 0},
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

    await wrapper.setProps({step: 1});
    expect(responses).to.have.length(1);
    panel.scrollTop = 12;
    responses.shift()!({
      ok: true,
      json: () => Promise.resolve([new LogMessage(LogMessageType.DEFAULT, 'updated', [])]),
    } as Response);
    await flushPromises();
    expect(panel.scrollTop).to.equal(12);

    panel.scrollTop = 80;
    await wrapper.setProps({step: 2});
    responses.shift()!({
      ok: true,
      json: () => Promise.resolve([new LogMessage(LogMessageType.DEFAULT, 'latest', [])]),
    } as Response);
    await flushPromises();
    expect(panel.scrollTop).to.equal(100);
    wrapper.unmount();
  });
});
