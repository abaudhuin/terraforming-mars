import {mount} from '@vue/test-utils';
import {globalConfig} from './getLocalVue';
import {expect} from 'chai';
import OrOptions from '@/client/components/OrOptions.vue';
import {PreferencesManager} from '@/client/utils/PreferencesManager';
import {InputResponse} from '@/common/inputs/InputResponse';
import PlayerInputFactory from '@/client/components/PlayerInputFactory.vue';

describe('OrOptions', () => {
  it('requests the controlled milestones overlay without losing the selected choice', async () => {
    const component = mount(OrOptions, {
      ...globalConfig,
      global: {...globalConfig.global, components: {'PlayerInputFactory': PlayerInputFactory}},
      props: {
        playerView: {},
        playerinput: {
          type: 'or',
          title: 'Claim a milestone',
          options: [
            {type: 'option', title: 'Builder', buttonLabel: 'Claim'},
            {type: 'option', title: 'Planner', buttonLabel: 'Claim'},
          ],
        },
        onsave: () => {},
        showsave: true,
      },
    });

    await component.findAll('input')[1].setValue(true);
    await component.find('.wf-context-strip button').trigger('click');

    expect(component.emitted('open-module')).to.deep.eq([['ma']]);
    expect((component.vm as any).selectedOption.title).to.eq('Planner');
  });
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
    const inputs = component.findAll('input');
    expect(inputs.length).to.eq(2);
    await inputs[0].setValue(true);
    await component.find('.wf-command-submit button').trigger('click');
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
    await component.find('.wf-command-submit button').trigger('click');
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
    expect(component.vm.selectedOption).to.eq(undefined);
    expect(component.findAllComponents({name: 'PlayerInputFactory'}).length).to.eq(0);

    const inputs = component.findAll('input');
    await inputs[0].setValue(true);
    expect(component.vm.selectedOption.title).to.eq('select a');

    // Click second radio
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
    await component.find('.wf-command-submit button').trigger('click');
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

    await component.find('.wf-command-submit button').trigger('click');
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

  it('child save button label includes card count', async () => {
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
    await component.find('input').setValue(true);
    expect(component.findComponent({name: 'AppButton'}).text()).to.eq('Sell 0');
  });

  it('commits a simple pass directly without a second confirmation', async () => {
    let savedData: InputResponse | undefined;
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
            title: 'Pass for this generation',
            buttonLabel: 'Pass',
          }],
        },
        onsave: (data: InputResponse) => {
          savedData = data;
        },
        showsave: true,
      },
    });

    expect(component.find('.wf-command-grid .wf-command-tile').exists()).to.eq(false);
    expect(component.find('.wf-command-pass-action').text()).to.contain('Pass for this generation');
    expect(component.find('.wf-command-danger-submit').exists()).to.eq(false);

    await component.find('.wf-command-pass-action').trigger('click');

    expect(savedData).to.deep.eq({type: 'or', index: 0, response: {type: 'option'}});
  });

  it('commits a top-level pass directly from the bottom danger action', async () => {
    let savedData: InputResponse | undefined;
    const component = mount(OrOptions, {
      ...globalConfig,
      global: {...globalConfig.global, components: {'PlayerInputFactory': PlayerInputFactory}},
      props: {
        playerView: {},
        playerinput: {
          type: 'or',
          title: '',
          options: [{
            type: 'projectCard',
            title: 'Play project card',
            buttonLabel: 'Play',
            cards: [],
            paymentOptions: {},
          }, {
            type: 'option',
            title: 'Pass for this generation',
            buttonLabel: 'Pass',
          }],
        },
        onsave: (data: InputResponse) => {
          savedData = data;
        },
        showsave: true,
      },
    });

    expect(component.findAll('.wf-command-grid .wf-command-tile')).to.have.length(1);
    expect(component.find('.wf-command-pass-action').text()).to.contain('Pass for this generation');
    expect(component.find('.wf-command-danger-submit').exists()).to.eq(false);

    await component.find('.wf-command-pass-action').trigger('click');

    expect(savedData).to.deep.eq({type: 'or', index: 1, response: {type: 'option'}});
  });
});
