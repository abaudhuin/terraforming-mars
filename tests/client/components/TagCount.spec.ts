
import {mount} from '@vue/test-utils';
import {globalConfig} from './getLocalVue';
import {expect} from 'chai';
import TagCount from '@/client/components/TagCount.vue';

describe('TagCount', () => {
  it('renders with no count', () => {
    const tagCount = mount(TagCount, {
      ...globalConfig,
      props: {
        count: 0,
        tag: 'building',
        size: 'normal',
      },
    });
    expect(tagCount.find('div[class="tag-display tag-display--building tag-no-show"]').exists()).is.true;
    expect(tagCount.find('span[class="tag-count-display tag-count-no-show"]').exists()).is.true;
  });
  it('renders with count', () => {
    const tagCount = mount(TagCount, {
      ...globalConfig,
      props: {
        count: 2,
        tag: 'building',
        size: 'normal',
      },
    });
    expect(tagCount.find('div[class="tag-display tag-display--building"]').exists()).is.true;
    expect(tagCount.find('span[class="tag-count-display"]').exists()).is.true;
  });

  it('exposes the city tag to component-local optical sizing', () => {
    const tagCount = mount(TagCount, {
      ...globalConfig,
      props: {
        count: 1,
        tag: 'city',
        size: 'big',
      },
    });

    expect(tagCount.classes()).to.include('tag-display--city');
    expect(tagCount.find('.tag-city').exists()).is.true;
  });
});
