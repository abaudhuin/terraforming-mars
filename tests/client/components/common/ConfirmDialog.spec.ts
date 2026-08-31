import {shallowMount} from '@vue/test-utils';
import {expect} from 'chai';
import {globalConfig} from '../getLocalVue';
import ConfirmDialog from '@/client/components/common/ConfirmDialog.vue';

describe('ConfirmDialog', () => {
  it('mounts without errors', () => {
    const wrapper = shallowMount(ConfirmDialog, {
      ...globalConfig,
      props: {
        message: 'Are you sure?',
      },
    });
    expect(wrapper.exists()).to.be.true;
  });

  it('opens the dialog when showModal is available', () => {
    const wrapper = shallowMount(ConfirmDialog, {
      ...globalConfig,
      props: {message: 'Are you sure?'},
    });
    const dialog = wrapper.find('dialog').element as HTMLDialogElement;
    let opened = 0;
    (dialog as any).showModal = () => opened++;

    (wrapper.vm as any).show();

    expect(opened).to.eq(1);
    expect((wrapper.vm as any).shown).to.be.true;
  });

  it('uses a visible in-app fallback when showModal is missing', async () => {
    const wrapper = shallowMount(ConfirmDialog, {
      ...globalConfig,
      props: {message: 'Place your tile here?'},
    });
    const dialog = wrapper.find('dialog').element as HTMLDialogElement;
    (dialog as any).showModal = undefined;
    (wrapper.vm as any).show();
    expect(dialog.hasAttribute('open')).to.be.true;
    expect(dialog.classList.contains('confirm-dialog--fallback-open')).to.be.true;
    expect(wrapper.emitted('accept')).to.eq(undefined);

    await wrapper.find('button.btn-primary').trigger('click');
    expect(wrapper.emitted('accept')).to.have.length(1);
    expect(dialog.hasAttribute('open')).to.be.false;
  });
});
