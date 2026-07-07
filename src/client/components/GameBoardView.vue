<!-- Common widgets between player and spectator views -->
<template>
  <div class="tm-game-board-view">
    <div class="tm-mars-board-surface">
      <a name="board" class="player_home_anchor hotkey-target"></a>
      <Board
        :spaces="game.spaces"
        :expansions="game.gameOptions.expansions"
        :venusScaleLevel="game.venusScaleLevel"
        :boardName ="game.gameOptions.boardName"
        :oceans_count="game.oceans"
        :oxygen_level="game.oxygenLevel"
        :temperature="game.temperature"
        :altVenusBoard="game.gameOptions.altVenusBoard"
        :aresData="game.aresData"
        :tileView="tileView"
        @toggleTileView="$emit('toggleTileView')"
        id="shortkey-board"
      />
    </div>

    <div class="tm-board-modules">
      <details v-if="game.turmoil" class="tm-extension-panel tm-extension-panel--turmoil">
        <summary v-i18n>Turmoil</summary>
        <a class="hotkey-target"></a>
        <Turmoil :turmoil="game.turmoil"/>
      </details>

      <details v-if="game.moon" class="tm-extension-panel tm-extension-panel--moon">
        <summary v-i18n>Moon</summary>
        <a class="hotkey-target"></a>
        <MoonBoard :model="game.moon" :tileView="tileView" id="shortkey-moonBoard"/>
      </details>

      <details v-if="game.gameOptions.expansions.pathfinders" class="tm-extension-panel tm-extension-panel--pathfinders">
        <summary v-i18n>Tracks</summary>
        <a class="hotkey-target"></a>
        <PlanetaryTracks :tracks="game.pathfinders" :gameOptions="game.gameOptions"/>
      </details>

      <details v-if="game.gameOptions.expansions.deltaProject" class="tm-extension-panel tm-extension-panel--delta">
        <summary v-i18n>Delta</summary>
        <DeltaProjectBoard :players="players"/>
      </details>
    </div>

    <details v-if="players.length > 1" class="player_home_block--milestones-and-awards tm-ma-panel">
      <summary class="tm-ma-panel-summary">
        <span class="tm-ma-panel-title" v-i18n>Milestones & Awards</span>
        <span class="tm-ma-panel-close tm-icon-control tm-icon-control--close" aria-hidden="true">
          <span></span>
        </span>
      </summary>
      <a class="hotkey-target"></a>
      <div class="tm-ma-panel-body">
        <Milestones :milestones="game.milestones" />
        <Awards :awards="game.awards" />
      </div>
    </details>
  </div>
</template>

<script lang="ts">
import {defineComponent, PropType} from 'vue';

import {GameModel} from '@/common/models/GameModel';
import {PublicPlayerModel} from '@/common/models/PlayerModel';
import Board from '@/client/components/Board.vue';
import DeltaProjectBoard from '@/client/components/delta/DeltaProjectBoard.vue';
import Milestones from '@/client/components/Milestones.vue';
import Awards from '@/client/components/Awards.vue';
import Turmoil from '@/client/components/turmoil/Turmoil.vue';
import MoonBoard from '@/client/components/moon/MoonBoard.vue';
import PlanetaryTracks from '@/client/components/pathfinders/PlanetaryTracks.vue';
import {TileView} from './board/TileView';

export default defineComponent({
  name: 'GameBoardView',
  props: {
    game: {
      type: Object as () => GameModel,
      required: true,
    },
    tileView: {
      type: String as () => TileView,
      required: true,
    },
    players: {
      type: Array as PropType<ReadonlyArray<PublicPlayerModel>>,
      required: true,
    },
  },
  emits: ['toggleTileView'],
  components: {
    Board,
    DeltaProjectBoard,
    Milestones,
    Awards,
    Turmoil,
    MoonBoard,
    PlanetaryTracks,
  },
});
</script>
