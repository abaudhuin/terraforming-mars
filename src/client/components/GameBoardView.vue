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
          :globalDeltas="globalDeltas"
          :altVenusBoard="game.gameOptions.altVenusBoard"
          :aresData="game.aresData"
          :tileView="tileView"
          @toggleTileView="$emit('toggleTileView')"
          id="shortkey-board"
        />
      </div>
    </div>

    <button
      v-if="openPanel"
      type="button"
      class="tm-module-backdrop"
      :aria-label="'Close ' + openPanel"
      @click="closePanels"></button>

    <div class="tm-board-modules" :class="{'tm-board-modules--panel-open': openPanel !== undefined}">
      <details
        v-if="game.turmoil"
        class="tm-extension-panel tm-extension-panel--turmoil"
        :open="openPanel === 'turmoil'"
        @toggle="handlePanelToggle('turmoil', $event)">
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

      <details
        v-if="game.moon"
        class="tm-extension-panel tm-extension-panel--moon"
        :open="openPanel === 'moon'"
        @toggle="handlePanelToggle('moon', $event)">
        <summary>
          <span class="tm-extension-panel-title" v-i18n>Moon</span>
          <span class="tm-extension-panel-close tm-icon-control tm-icon-control--close" aria-hidden="true">
            <span></span>
          </span>
        </summary>
        <a class="hotkey-target"></a>
        <div class="tm-extension-panel-body tm-extension-panel-body--moon">
          <MoonBoard :model="game.moon" :tileView="tileView" id="shortkey-moonBoard"/>
        </div>
      </details>

      <details
        v-if="game.gameOptions.expansions.pathfinders"
        class="tm-extension-panel tm-extension-panel--pathfinders"
        :open="openPanel === 'pathfinders'"
        @toggle="handlePanelToggle('pathfinders', $event)">
        <summary>
          <span class="tm-extension-panel-title" v-i18n>Tracks</span>
          <span class="tm-extension-panel-close tm-icon-control tm-icon-control--close" aria-hidden="true">
            <span></span>
          </span>
        </summary>
        <a class="hotkey-target"></a>
        <div class="tm-extension-panel-body tm-extension-panel-body--pathfinders" @wheel="scrollPathfindersHorizontally">
          <PlanetaryTracks :tracks="game.pathfinders" :gameOptions="game.gameOptions"/>
        </div>
      </details>

      <details
        v-if="game.gameOptions.expansions.underworld"
        class="tm-extension-panel tm-extension-panel--underworld"
        :open="openPanel === 'underworld'"
        @toggle="handlePanelToggle('underworld', $event)">
        <summary>
          <span class="tm-extension-panel-title" v-i18n>Underworld</span>
          <span class="tm-extension-panel-close tm-icon-control tm-icon-control--close" aria-hidden="true">
            <span></span>
          </span>
        </summary>
        <div class="tm-extension-panel-body tm-extension-panel-body--underworld">
          <section
            v-for="player in players"
            :key="player.color"
            class="tm-underworld-player">
            <header class="tm-underworld-player-header">
              <span class="tm-underworld-player-name" :class="'player_bg_color_' + player.color">{{ player.name }}</span>
              <span class="tm-underworld-corruption">
                <span v-i18n>Corruption</span>
                <strong>{{ player.underworldData.corruption }}</strong>
              </span>
            </header>
            <UndergroundTokens :underworldData="player.underworldData"/>
            <p v-if="player.underworldData.tokens.length === 0" class="tm-underworld-empty" v-i18n>No claimed tokens</p>
          </section>
        </div>
      </details>

      <details
        v-if="game.gameOptions.expansions.deltaProject"
        class="tm-extension-panel tm-extension-panel--delta"
        :open="openPanel === 'delta'"
        @toggle="handlePanelToggle('delta', $event)">
        <summary>
          <span class="tm-extension-panel-title" v-i18n>Delta</span>
          <span class="tm-extension-panel-close tm-icon-control tm-icon-control--close" aria-hidden="true">
            <span></span>
          </span>
        </summary>
        <div class="tm-extension-panel-body tm-extension-panel-body--delta">
          <DeltaProjectBoard :players="players"/>
        </div>
      </details>
    </div>

    <details
      v-if="players.length > 1"
      class="player_home_block--milestones-and-awards tm-ma-panel"
      :open="openPanel === 'ma'"
      @toggle="handlePanelToggle('ma', $event)">
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
import UndergroundTokens from '@/client/components/underworld/UndergroundTokens.vue';
import {TileView} from './board/TileView';
import {calculateBoardFit} from '@/client/utils/BoardFit';
import {GlobalDelta} from '@/client/utils/ActionFeedback';

type GameBoardViewModel = {
  boardScale: number;
  boardCenterX: number;
  boardCenterY: number;
  boardResizeObserver: ResizeObserver | undefined;
  boardFitFrame: number | undefined;
  openPanel: ExtensionPanelKind | undefined;
};

type ExtensionPanelKind = 'turmoil' | 'moon' | 'pathfinders' | 'underworld' | 'delta' | 'ma';

export default defineComponent({
  name: 'GameBoardView',
  data(): GameBoardViewModel {
    return {
      boardScale: 1,
      boardCenterX: 0,
      boardCenterY: 0,
      boardResizeObserver: undefined,
      boardFitFrame: undefined,
      openPanel: undefined,
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
    globalDeltas: {
      type: Array as PropType<ReadonlyArray<GlobalDelta>>,
      required: false,
      default: () => [],
    },
    fitBottomInset: {
      type: Number,
      required: false,
      default: 0,
    },
    fitTopInset: {
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
  emits: ['toggleTileView', 'panel-change'],
  components: {
    Board,
    DeltaProjectBoard,
    Milestones,
    Awards,
    Turmoil,
    MoonBoard,
    PlanetaryTracks,
    UndergroundTokens,
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
    handlePanelToggle(panel: ExtensionPanelKind, event: Event): void {
      const details = event.currentTarget;
      if (!(details instanceof HTMLDetailsElement)) {
        return;
      }
      if (details.open) {
        if (this.openPanel !== panel) {
          this.openPanel = panel;
          this.$emit('panel-change', panel);
        }
        return;
      }
      if (this.openPanel === panel) {
        this.openPanel = undefined;
        this.$emit('panel-change', undefined);
      }
    },
    closePanels(): void {
      if (this.openPanel === undefined) {
        return;
      }
      this.openPanel = undefined;
      this.$emit('panel-change', undefined);
    },
    scrollPathfindersHorizontally(event: WheelEvent) {
      const scroller = event.currentTarget;
      if (!(scroller instanceof HTMLElement) || scroller.scrollWidth <= scroller.clientWidth) {
        return;
      }
      const hasVerticalOverflow = scroller.scrollHeight > scroller.clientHeight + 1;
      if (!event.shiftKey && hasVerticalOverflow) {
        return;
      }
      if (!event.shiftKey && Math.abs(event.deltaY) <= Math.abs(event.deltaX)) {
        return;
      }
      event.preventDefault();
      scroller.scrollLeft += event.deltaX || event.deltaY;
    },
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
      const topInset = Math.max(0, Math.min(this.fitTopInset, rect.height));
      const fit = calculateBoardFit(rect.width, rect.height - topInset, this.fitBottomInset, this.maxBoardScale);
      this.boardScale = fit.scale;
      this.boardCenterX = fit.centerX;
      this.boardCenterY = fit.centerY + topInset;
    },
  },
});
</script>
