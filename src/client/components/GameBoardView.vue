<!-- Common widgets between player and spectator views -->
<template>
  <div class="tm-game-board-view">
    <div class="tm-mars-board-surface" ref="boardViewport">
      <a name="board" class="player_home_anchor hotkey-target"></a>
      <div class="tm-board-fit-canvas" :style="boardFitStyle">
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
    </div>

    <div class="tm-board-modules">
      <details v-if="game.turmoil" class="tm-extension-panel tm-extension-panel--turmoil">
        <summary>
          <span class="tm-extension-panel-title" v-i18n>Turmoil</span>
          <span class="tm-extension-panel-close tm-icon-control tm-icon-control--close" aria-hidden="true">
            <span></span>
          </span>
        </summary>
        <a class="hotkey-target"></a>
        <div class="tm-extension-panel-body tm-extension-panel-body--turmoil">
          <Turmoil :turmoil="game.turmoil"/>
        </div>
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
import {calculateBoardFit} from '@/client/utils/BoardFit';

type GameBoardViewModel = {
  boardScale: number;
  boardCenterX: number;
  boardCenterY: number;
  boardResizeObserver: ResizeObserver | undefined;
  boardFitFrame: number | undefined;
};

export default defineComponent({
  name: 'GameBoardView',
  data(): GameBoardViewModel {
    return {
      boardScale: 1,
      boardCenterX: 0,
      boardCenterY: 0,
      boardResizeObserver: undefined,
      boardFitFrame: undefined,
    };
  },
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
    fitBottomInset: {
      type: Number,
      required: false,
      default: 0,
    },
    maxBoardScale: {
      type: Number,
      required: false,
      default: 1.6,
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
  computed: {
    boardFitStyle(): Record<string, string> {
      return {
        left: `${this.boardCenterX}px`,
        top: `${this.boardCenterY}px`,
        transform: `translate(-50%, -50%) scale(${this.boardScale.toFixed(4)})`,
      };
    },
  },
  mounted() {
    this.installBoardFit();
  },
  updated() {
    this.queueBoardFit();
  },
  beforeUnmount() {
    this.boardResizeObserver?.disconnect();
    this.boardResizeObserver = undefined;
    window.removeEventListener('resize', this.queueBoardFit);
    if (this.boardFitFrame !== undefined && typeof cancelAnimationFrame !== 'undefined') {
      cancelAnimationFrame(this.boardFitFrame);
    }
  },
  methods: {
    installBoardFit(): void {
      const viewport = this.$refs.boardViewport;
      if (viewport instanceof HTMLElement && typeof ResizeObserver !== 'undefined') {
        this.boardResizeObserver = new ResizeObserver(this.queueBoardFit);
        this.boardResizeObserver.observe(viewport);
      }
      window.addEventListener('resize', this.queueBoardFit);
      this.queueBoardFit();
      document.fonts?.ready.then(this.queueBoardFit).catch(() => {});
    },
    queueBoardFit(): void {
      if (this.boardFitFrame !== undefined && typeof cancelAnimationFrame !== 'undefined') {
        cancelAnimationFrame(this.boardFitFrame);
      }
      if (typeof requestAnimationFrame === 'undefined') {
        this.updateBoardFit();
        return;
      }
      this.boardFitFrame = requestAnimationFrame(() => {
        this.boardFitFrame = undefined;
        this.updateBoardFit();
      });
    },
    updateBoardFit(): void {
      const viewport = this.$refs.boardViewport;
      if (!(viewport instanceof HTMLElement)) {
        return;
      }
      const rect = viewport.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) {
        return;
      }
      const fit = calculateBoardFit(rect.width, rect.height, this.fitBottomInset, this.maxBoardScale);
      this.boardScale = fit.scale;
      this.boardCenterX = fit.centerX;
      this.boardCenterY = fit.centerY;
    },
  },
});
</script>
