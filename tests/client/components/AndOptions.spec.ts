
import {mount} from '@vue/test-utils';
import {globalConfig} from './getLocalVue';

import {expect} from 'chai';
import AndOptions from '@/client/components/AndOptions.vue';
import {InputResponse} from '@/common/inputs/InputResponse';
import PlayerInputFactory from '@/client/components/PlayerInputFactory.vue';
import {ColonyName} from '@/common/colonies/ColonyName';

describe('AndOptions', () => {
  it('saveData calls saveData on all child refs and captures responses', async () => {
    let savedData: InputResponse | undefined;
    const component = mount(AndOptions, {
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
          title: 'foo',
          options: [{
            type: 'option',
            title: 'select a',
          }, {
            type: 'option',
            title: 'select b',
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
    await component.vm.$nextTick();
    await buttons[0].trigger('click');
    expect(savedData).to.not.be.undefined;
    expect(savedData!.type).to.eq('and');
    const andResponse = savedData as {type: string, responses: Array<InputResponse>};
    expect(andResponse.responses).to.have.length(2);
    expect(andResponse.responses[0].type).to.eq('option');
    expect(andResponse.responses[1].type).to.eq('option');
  });

  it('saves the options', async () => {
    let savedData: InputResponse | undefined;
    const component = mount(AndOptions, {
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
          title: 'foo',
          options: [{
            type: 'option',
            title: 'select a',
          }, {
            title: 'select b',
            type: 'option',
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
    await component.vm.$nextTick();
    await buttons[0].trigger('click');
    expect(savedData).to.deep.eq({type: 'and', responses: [{type: 'option'}, {type: 'option'}]});
  });

  it('saves a paid colony trade through nested or and colony inputs', async () => {
    let savedData: InputResponse | undefined;
    const component = mount(AndOptions, {
      ...globalConfig,
      global: {
        ...globalConfig.global,
        components: {
          'PlayerInputFactory': PlayerInputFactory,
        },
      },
      props: {
        playerView: {
          thisPlayer: {
            name: 'Red player',
            color: 'red',
            fleetSize: 1,
            tradesThisGeneration: 0,
          },
          players: [],
        },
        playerinput: {
          type: 'and',
          title: 'Trade with a colony tile',
          buttonLabel: 'Trade',
          options: [{
            type: 'or',
            title: 'Pay trade fee',
            buttonLabel: 'Pay',
            options: [{
              type: 'option',
              title: 'Pay 9 M€',
              buttonLabel: 'Confirm',
            }],
            initialIdx: 0,
          }, {
            type: 'colony',
            title: 'Select colony tile for trade',
            buttonLabel: 'trade',
            coloniesModel: [{
              colonies: [],
              isActive: true,
              name: ColonyName.CALLISTO,
              trackPosition: 0,
            }],
          }],
        },
        onsave: (data: InputResponse) => savedData = data,
        showsave: true,
        showtitle: true,
      },
    });

    await component.vm.$nextTick();
    const inputs = component.findAll('input[type="radio"]');
    expect((inputs[0].element as HTMLInputElement).checked).to.eq(true);
    expect(component.findComponent({name: 'AppButton'}).props('disabled')).to.eq(true);
    await inputs[1].setValue(true);
    expect(component.findComponent({name: 'AppButton'}).props('disabled')).to.eq(false);
    await component.findComponent({name: 'AppButton'}).trigger('click');

    expect(savedData).to.deep.eq({
      type: 'and',
      responses: [
        {type: 'or', index: 0, response: {type: 'option'}},
        {type: 'colony', colonyName: ColonyName.CALLISTO},
      ],
    });
  });
});
