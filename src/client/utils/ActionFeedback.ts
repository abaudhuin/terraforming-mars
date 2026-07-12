import {GlobalParameter} from '@/common/GlobalParameter';
import {PlayerViewModel, PublicPlayerModel} from '@/common/models/PlayerModel';
import {Resource, ALL_RESOURCES} from '@/common/Resource';
import {Color} from '@/common/Color';
import {ColonyName} from '@/common/colonies/ColonyName';
import {SpaceId} from '@/common/Types';

export type ResourceDelta = {
  playerColor: Color;
  playerName: string;
  resource: Resource;
  amount: number;
  production: number;
};

export type GlobalDelta = {
  parameter: GlobalParameter;
  amount: number;
};

export type ActionFeedback = {
  resources: Array<ResourceDelta>;
  globals: Array<GlobalDelta>;
  spaces: Array<SpaceId>;
  colonies: Array<ColonyName>;
};

const resourceFields: Record<Resource, {stock: keyof PublicPlayerModel, production: keyof PublicPlayerModel}> = {
  [Resource.MEGACREDITS]: {stock: 'megacredits', production: 'megacreditProduction'},
  [Resource.STEEL]: {stock: 'steel', production: 'steelProduction'},
  [Resource.TITANIUM]: {stock: 'titanium', production: 'titaniumProduction'},
  [Resource.PLANTS]: {stock: 'plants', production: 'plantProduction'},
  [Resource.ENERGY]: {stock: 'energy', production: 'energyProduction'},
  [Resource.HEAT]: {stock: 'heat', production: 'heatProduction'},
};

function numberField(player: PublicPlayerModel, field: keyof PublicPlayerModel): number {
  const value = player[field];
  return typeof value === 'number' ? value : 0;
}
function getResourceDeltas(previous: PlayerViewModel, next: PlayerViewModel): Array<ResourceDelta> {
  const previousPlayers = new Map(previous.players.map((player) => [player.color, player]));
  const deltas: Array<ResourceDelta> = [];

  for (const player of next.players) {
    const before = previousPlayers.get(player.color);
    if (before === undefined) {
      continue;
    }
    for (const resource of ALL_RESOURCES) {
      const fields = resourceFields[resource];
      const amount = numberField(player, fields.stock) - numberField(before, fields.stock);
      const production = numberField(player, fields.production) - numberField(before, fields.production);
      if (amount !== 0 || production !== 0) {
        deltas.push({playerColor: player.color, playerName: player.name, resource, amount, production});
      }
    }
  }
  return deltas;
}

function getGlobalDeltas(previous: PlayerViewModel, next: PlayerViewModel): Array<GlobalDelta> {
  const candidates: Array<{parameter: GlobalParameter, before: number, after: number}> = [
    {parameter: GlobalParameter.TEMPERATURE, before: previous.game.temperature, after: next.game.temperature},
    {parameter: GlobalParameter.OXYGEN, before: previous.game.oxygenLevel, after: next.game.oxygenLevel},
    {parameter: GlobalParameter.OCEANS, before: previous.game.oceans, after: next.game.oceans},
    {parameter: GlobalParameter.VENUS, before: previous.game.venusScaleLevel, after: next.game.venusScaleLevel},
  ];
  return candidates
    .filter(({before, after}) => before !== after)
    .map(({parameter, before, after}) => ({parameter, amount: after - before}));
}

export function getActionFeedback(previous: PlayerViewModel, next: PlayerViewModel): ActionFeedback {
  const previousSpaces = new Map(previous.game.spaces.map((space) => [space.id, JSON.stringify(space)]));
  const spaces = next.game.spaces
    .filter((space) => previousSpaces.get(space.id) !== JSON.stringify(space))
    .map((space) => space.id);

  const previousColonies = new Map(previous.game.colonies.map((colony) => [colony.name, JSON.stringify(colony)]));
  const colonies = next.game.colonies
    .filter((colony) => previousColonies.get(colony.name) !== JSON.stringify(colony))
    .map((colony) => colony.name);

  return {
    resources: getResourceDeltas(previous, next),
    globals: getGlobalDeltas(previous, next),
    spaces,
    colonies,
  };
}
