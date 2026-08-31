import {shallowMount} from '@vue/test-utils';
import {expect} from 'chai';
import App from '@/client/components/App.vue';
import {globalConfig} from './getLocalVue';

describe('App alerts', () => {
  it('opens the styled app dialog and runs its callback once', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const wrapper = shallowMount(App, {...globalConfig, attachTo: host});
    const dialog = wrapper.find('#alert-dialog').element as HTMLDialogElement;
    let opened = 0;
    let callbacks = 0;
    let nativeAlerts = 0;
    (dialog as any).showModal = () => opened++;
    const originalAlert = window.alert;
    window.alert = () => nativeAlerts++;

    try {
      (wrapper.vm as any).showAlert('Placement failed', 'Choose another space', () => callbacks++);
      expect(opened).to.eq(1);
      expect(nativeAlerts).to.eq(0);
      expect(wrapper.find('#alert-dialog-title').text()).to.eq('Placement failed');
      expect(wrapper.find('#alert-dialog-message').text()).to.eq('Choose another space');

      await wrapper.find('#alert-dialog-button').trigger('click');
      expect(callbacks).to.eq(1);
    } finally {
      window.alert = originalAlert;
      wrapper.unmount();
      host.remove();
    }
  });

  it('uses a visible in-app fallback instead of native alert when showModal is missing', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const wrapper = shallowMount(App, {...globalConfig, attachTo: host});
    const dialog = wrapper.find('#alert-dialog').element as HTMLDialogElement;
    (dialog as any).showModal = undefined;
    let callbacks = 0;
    let nativeAlerts = 0;
    const originalAlert = window.alert;
    window.alert = () => nativeAlerts++;

    try {
      (wrapper.vm as any).showAlert('Placement failed', 'Choose another space', () => callbacks++);
      expect(nativeAlerts).to.eq(0);
      expect(dialog.hasAttribute('open')).to.be.true;
      expect(dialog.classList.contains('alert-dialog--fallback-open')).to.be.true;

      await wrapper.find('#alert-dialog-button').trigger('click');
      expect(callbacks).to.eq(1);
      expect(dialog.hasAttribute('open')).to.be.false;
    } finally {
      window.alert = originalAlert;
      wrapper.unmount();
      host.remove();
    }
  });
});
