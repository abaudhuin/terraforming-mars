import {mount} from '@vue/test-utils';
import {globalConfig} from './getLocalVue';
import {expect} from 'chai';
import OrOptions from '@/client/components/OrOptions.vue';
import {PreferencesManager} from '@/client/utils/PreferencesManager';
import {InputResponse} from '@/common/inputs/InputResponse';
import PlayerInputFactory from '@/client/components/PlayerInputFactory.vue';

describe('OrOptions', () => {
  it('saves the options ignoring hidden', async () => {
    let savedData: InputResponse | undefined;
    PreferencesManager.INSTANCE.set('learner_mode', false);
    const component = mount(OrOptions, {
      ...globalConfig,
      global: {
        ...globalConfig.global,
        components: {
          'PlayerInputFactory': PlayerInputFactory,
        },
      },
      props: {
        player: {
          id: 'foo',
        },
        players: [],
        playerView: {},
        playerinput: {
          type: 'or',
          title: 'foo',
          options: [{
            type: 'card',
            title: 'hide this',
            showOnlyInLearnerMode: true,
          }, {
            type: 'option',
            title: 'select a',
            buttonLabel: '',
          }, {
            title: 'select b',
            type: 'option',
            buttonLabel: '',
          }],
        },
        onsave: function(data: InputResponse) {
          savedData = data;
        },
        showsave: true,
        showtitle: true,
      },
    });
    const buttons = component.findAllComponents({name: 'AppButton'});
    await buttons[0].trigger('click');
    expect(savedData).to.deep.eq({type: 'or', index: 1, response: {type: 'option'}});
  });
  it('playerFactorySaved returns correct original index when options are filtered', async () => {
    let savedData: InputResponse | undefined;
    PreferencesManager.INSTANCE.set('learner_mode', false);
    const component = mount(OrOptions, {
      ...globalConfig,
      global: {
        ...globalConfig.global,
        components: {
          'PlayerInputFactory': PlayerInputFactory,
        },
      },
      props: {
        player: {
          id: 'foo',
        },
        players: [],
        playerView: {},
        playerinput: {
          type: 'or',
          title: 'foo',
          options: [{
            type: 'card',
            title: 'hide this',
            showOnlyInLearnerMode: true,
          }, {
            type: 'option',
            title: 'select a',
            buttonLabel: '',
          }, {
            type: 'option',
            title: 'select b',
            buttonLabel: '',
          }],
        },
        onsave: function(data: InputResponse) {
          savedData = data;
        },
        showsave: true,
        showtitle: true,
      },
    });
    // First option (card) is filtered out. Two displayed: select a (orig 1), select b (orig 2).
    const inputs = component.findAll('input');
    expect(inputs.length).to.eq(2);
    // Select the second displayed option (select b, original index 2)
    await inputs[1].setValue(true);
    const buttons = component.findAllComponents({name: 'AppButton'});
    await buttons[0].trigger('click');
    expect(savedData).to.deep.eq({type: 'or', index: 2, response: {type: 'option'}});
  });

  it('selecting different simple options keeps the inline command form', async () => {
    const component = mount(OrOptions, {
      ...globalConfig,
      global: {
        ...globalConfig.global,
        components: {
          'PlayerInputFactory': PlayerInputFactory,
        },
      },
      props: {
        player: {
          id: 'foo',
        },
        players: [],
        playerView: {},
        playerinput: {
          type: 'or',
          title: 'foo',
          options: [{
            type: 'option',
            title: 'select a',
          }, {
            type: 'option',
            title: 'select b',
          }],
        },
        onsave: () => {},
        showsave: true,
        showtitle: true,
      },
    });
    expect(component.vm.selectedOption.title).to.eq('select a');
    expect(component.findAllComponents({name: 'PlayerInputFactory'}).length).to.eq(0);

    // Click second radio
    const inputs = component.findAll('input');
    await inputs[1].setValue(true);

    expect(component.vm.selectedOption.title).to.eq('select b');
    expect(component.findAllComponents({name: 'PlayerInputFactory'}).length).to.eq(0);
  });

  it('saving with non-first selected option returns correct index', async () => {
    let savedData: InputResponse | undefined;
    const component = mount(OrOptions, {
      ...globalConfig,
      global: {
        ...globalConfig.global,
        components: {
          'PlayerInputFactory': PlayerInputFactory,
        },
      },
      props: {
        player: {
          id: 'foo',
        },
        players: [],
        playerView: {},
        playerinput: {
          type: 'or',
          title: 'foo',
          options: [{
            type: 'option',
            title: 'select a',
            buttonLabel: '',
          }, {
            type: 'option',
            title: 'select b',
            buttonLabel: '',
          }, {
            type: 'option',
            title: 'select c',
            buttonLabel: '',
          }],
        },
        onsave: function(data: InputResponse) {
          savedData = data;
        },
        showsave: true,
        showtitle: true,
      },
    });
    // Select third option
    const inputs = component.findAll('input');
    await inputs[2].setValue(true);
    const buttons = component.findAllComponents({name: 'AppButton'});
    await buttons[0].trigger('click');
    expect(savedData).to.deep.eq({type: 'or', index: 2, response: {type: 'option'}});
  });

  it('clicks 2nd option', async () => {
    let savedData: InputResponse | undefined;
    const component = mount(OrOptions, {
      ...globalConfig,
      global: {
        ...globalConfig.global,
        components: {
          'PlayerInputFactory': PlayerInputFactory,
        },
      },
      props: {
        player: {
          id: 'foo',
        },
        players: [],
        playerView: {},
        playerinput: {
          type: 'or',
          title: 'foo',
          options: [{
            type: 'option',
            title: 'select a',
            buttonLabel: '',
          }, {
            type: 'option',
            title: 'select b',
            buttonLabel: '',
          }],
        },
        onsave: function(data: InputResponse) {
          savedData = data;
        },
        showsave: true,
        showtitle: true,
      },
    });
    const inputs = component.findAll('input');
    await inputs[1].setValue(true);

    const buttons = component.findAllComponents({name: 'AppButton'});
    await buttons[0].trigger('click');
    expect(savedData).to.deep.eq({type: 'or', index: 1, response: {type: 'option'}});
  });

  it('renders child forms only for non-option selections', async () => {
    const component = mount(OrOptions, {
      ...globalConfig,
      global: {...globalConfig.global, components: {'PlayerInputFactory': PlayerInputFactory}},
      props: {
        playerView: {},
        playerinput: {
          type: 'or',
          title: '',
          options: [{
            type: 'option',
            title: 'select a',
            buttonLabel: '',
          }, {
            type: 'card',
            title: 'Sell Patents',
            buttonLabel: 'Sell',
            cards: [],
            min: 0,
            max: 5,
            showOnlyInLearnerMode: false,
            selectBlueCardAction: false,
            showOwner: false,
          }],
        },
        onsave: () => {},
      },
    });
    expect(component.findAllComponents({name: 'PlayerInputFactory'}).length).to.eq(0);

    const inputs = component.findAll('input');
    await inputs[1].setValue(true);

    const factories = component.findAllComponents({name: 'PlayerInputFactory'});
    expect(factories.length).to.eq(1);
    expect(factories[0].props('playerinput').title).to.eq('Sell Patents');
  });

  it('child save button label includes card count', () => {
    const component = mount(OrOptions, {
      ...globalConfig,
      global: {...globalConfig.global, components: {'PlayerInputFactory': PlayerInputFactory}},
      props: {
        playerView: {},
        playerinput: {
          type: 'or',
          title: '',
          options: [{
            type: 'card',
            title: 'Sell Patents',
            buttonLabel: 'Sell',
            cards: [],
            min: 0,
            max: 5,
            showOnlyInLearnerMode: false,
            selectBlueCardAction: false,
            showOwner: false,
          }],
        },
        onsave: () => {},
        showsave: true,
      },
    });
    expect(component.findComponent({name: 'AppButton'}).text()).to.eq('Sell 0');
  });
});
