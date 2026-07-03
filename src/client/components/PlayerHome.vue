<template>
  <div id="player-home" :class="tableClasses" :style="tableStyle">
    <div v-if="game.phase === 'end'" class="tm-end-banner">
      <DynamicTitle title="This game is over!" :color="thisPlayer.color"/>
      <a :href="'the-end?id='+ playerView.id" v-i18n>Go to game results</a>
    </div>

    <template v-if="thisPlayer.tableau.length === 0">
      <div class="tm-setup-shell">
        <header class="tm-table-hud tm-table-hud--setup">
          <div class="tm-hud-cluster tm-hud-cluster--identity">
            <div class="tm-hud-label" v-i18n>Setup</div>
            <div class="tm-hud-title">{{ game.name }}</div>
          </div>
          <div class="tm-global-strip">
            <GlobalParameterValue :param="GlobalParameter.TEMPERATURE" :value="game.temperature"/>
            <GlobalParameterValue :param="GlobalParameter.OXYGEN" :value="game.oxygenLevel"/>
            <GlobalParameterValue :param="GlobalParameter.OCEANS" :value="game.oceans"/>
            <GlobalParameterValue v-if="game.gameOptions.expansions.venus" :param="GlobalParameter.VENUS" :value="game.venusScaleLevel"/>
            <MoonGlobalParameterValue v-if="game.moon" :moonData="game.moon"/>
          </div>
          <div class="tm-turn-status">
            <span class="tm-status-pill" :class="{'tm-status-pill--active': isPlayerActing(playerView)}">{{ turnStatusLabel }}</span>
          </div>
        </header>
        <PlayerSetupView :playerView="playerView" :tileView="tileView"/>
        <div class="tm-purge-warning tm-purge-warning--setup">
          <PurgeWarning :expectedPurgeTimeMs="game.expectedPurgeTimeMs"/>
        </div>
      </div>
    </template>

    <template v-else>
      <header class="tm-table-hud">
        <div class="tm-turn-context">
          <span class="tm-status-pill" :class="{'tm-status-pill--active': isPlayerActing(playerView)}">{{ turnStatusLabel }}</span>
          <span v-if="activePlayer" class="tm-active-player" :class="'player_bg_color_' + activePlayer.color">{{ activePlayer.name }}</span>
          <span class="tm-hud-chip">{{ generationLabel }}</span>
        </div>

        <div class="tm-next-context">
          <span v-if="nextPlayer" v-i18n>Next</span>
          <strong v-if="nextPlayer" :class="'player_bg_color_' + nextPlayer.color">{{ nextPlayer.name }}</strong>
          <span v-else>{{ actionSummary }}</span>
        </div>

        <div class="tm-top-tools">
          <button type="button" @click="openOverlay('board')" v-i18n>Board</button>
          <button type="button" @click="openOverlay('cards')" v-i18n>Cards</button>
          <button type="button" @click="openPlayers" v-i18n>Players</button>
        </div>
      </header>

      <main class="tm-table-main">
        <aside class="tm-player-rail" id="shortkey-playersoverview">
          <PlayersOverview :playerView="playerView" @open-player="openPlayer" v-trim-whitespace/>
        </aside>

        <section class="tm-board-stage">
          <button type="button" class="tm-board-expand-button" @click="openOverlay('board')" v-i18n>Expand</button>
          <GameBoardView
            :game="game"
            :tileView="tileView"
            :players="playerView.players"
            @toggleTileView="cycleTileView()"
          />

          <details v-if="game.colonies.length > 0" class="tm-table-leaf tm-table-leaf--colonies" ref="colonies" id="shortkey-colonies">
            <summary class="tm-table-leaf-summary">
              <span v-i18n>Colonies</span>
              <small v-i18n>trade and build targets</small>
            </summary>
            <a name="colonies" class="player_home_anchor hotkey-target"></a>
            <div class="colonies-fleets-cont">
              <div class="colonies-player-fleets" v-for="colonyPlayer in playerView.players" :key="colonyPlayer.color">
                <div :class="'colonies-fleet colonies-fleet-'+ colonyPlayer.color" v-for="idx in getFleetsCountRange(colonyPlayer)" :key="idx"></div>
              </div>
            </div>
            <div class="player_home_colony_cont">
              <div class="player_home_colony" v-for="colony in game.colonies" :key="colony.name">
                <Colony :colony="colony" :active="colony.isActive"/>
              </div>
            </div>
          </details>
        </section>

        <aside class="tm-activity-rail">
          <button
            type="button"
            class="tm-layout-resize-handle tm-layout-resize-handle--activity"
            :aria-label="$t('Resize activity log')"
            @pointerdown="startActivityResize"></button>
          <div class="tm-panel-heading">
            <span v-i18n>Activity</span>
            <button type="button" class="tm-panel-icon-button" @click="openOverlay('log')" :aria-label="$t('Open game log')">
              <span aria-hidden="true"></span>
            </button>
          </div>
          <LogPanel
            :viewModel="playerView"
            :color="thisPlayer.color"
            :step="game.step"
            cardPanelMode="emit"
            @preview-message="openActivityLogPreview"/>
        </aside>
      </main>

      <section class="tm-bottom-tray" :class="{'tm-bottom-tray--log-preview': showActivityLogPreview}">
        <button
          type="button"
          class="tm-layout-resize-handle tm-layout-resize-handle--bottom"
          :aria-label="$t('Resize bottom panel')"
          @pointerdown="startBottomResize"></button>
        <section v-if="showActivityLogPreview && activityPreviewMessage" class="tm-log-preview-desk">
          <header class="tm-log-preview-header">
            <div>
              <span v-i18n>Activity detail</span>
              <small v-i18n>from the game log</small>
            </div>
            <button type="button" class="tm-log-preview-close" @click="closeActivityLogPreview" :aria-label="$t('Close activity detail')">
              <span aria-hidden="true"></span>
            </button>
          </header>
          <ul class="tm-log-preview-message-list">
            <LogMessageComponent :message="activityPreviewMessage" :viewModel="playerView"/>
          </ul>
          <CardPanel :message="activityPreviewMessage" :players="playerView.players" :showClose="false"/>
        </section>

        <template v-else>
        <section class="tm-action-workbench player_home_block--actions" tabindex="-1">
          <a name="actions" class="player_home_anchor"></a>
          <div class="tm-panel-heading">
            <span v-i18n>Actions</span>
            <span class="tm-compat-text">Actions</span>
            <button v-if="isDecisionActive" type="button" class="tm-hand-open-button" @click="openCardsOverlay('hand')" :aria-label="$t('Open hand')">
              <span class="tm-hand-open-button__icon" aria-hidden="true"></span>
              <span v-i18n>Hand</span>
              <strong>{{ cardsInHandCount }}</strong>
            </button>
          </div>
          <WaitingFor v-if="game.phase !== 'end'" :playerView="playerView" :waitingfor="playerView.waitingFor"/>
        </section>

        <section class="tm-card-desk" :class="{'tm-card-desk--engine-only': cardsInHandCount === 0 && playerView.draftedCards.length === 0}">
          <a name="cards" class="player_home_anchor"></a>
          <div class="tm-card-zone tm-card-zone--hand" v-if="playerView.draftedCards.length > 0">
            <div class="tm-panel-heading">
              <span v-i18n>Drafted cards</span>
              <small>{{ playerView.draftedCards.length }}</small>
            </div>
            <div class="tm-card-strip">
              <div v-for="card in playerView.draftedCards" :key="card.name" class="cardbox">
                <Card :card="card"/>
              </div>
            </div>
          </div>

          <div class="tm-card-zone tm-card-zone--hand" v-if="cardsInHandCount > 0" id="shortkey-hand">
            <div class="tm-panel-heading tm-panel-heading--interactive">
              <span v-i18n>Hand</span>
              <button type="button" :class="getHideButtonClass('HAND')" @click.prevent="toggle('HAND')">
                <span class="played-cards-count">{{ cardsInHandCount.toString() }}</span>
                <span class="played-cards-selection" v-i18n>{{ getToggleLabel('HAND') }}</span>
              </button>
            </div>
            <div v-show="isVisible('HAND') || !isDecisionActive" class="tm-card-strip">
              <SortableCards :playerId="playerView.id" :cards="allCardsInHand"/>
            </div>
          </div>

          <div class="tm-card-zone tm-card-zone--engine">
            <div class="tm-panel-heading tm-panel-heading--interactive">
              <span v-i18n>Played cards</span>
              <div class="played-cards-filters">
                <button type="button" :class="getHideButtonClass('ACTIVE')" @click.prevent="toggle('ACTIVE')">
                  <span class="played-cards-count">{{ activeTableauCount }}</span>
                  <span class="played-cards-selection" v-i18n>Blue</span>
                </button>
                <button type="button" :class="getHideButtonClass('AUTOMATED')" @click.prevent="toggle('AUTOMATED')">
                  <span class="played-cards-count">{{ automatedTableauCount }}</span>
                  <span class="played-cards-selection" v-i18n>Green</span>
                </button>
                <button type="button" :class="getHideButtonClass('EVENT')" @click.prevent="toggle('EVENT')">
                  <span class="played-cards-count">{{ eventTableauCount }}</span>
                  <span class="played-cards-selection" v-i18n>Events</span>
                </button>
              </div>
            </div>

            <div class="tm-card-strip">
              <div v-for="card in getCardsByType(thisPlayer.tableau, [CardType.CORPORATION])" :key="card.name" class="cardbox">
                <Card :card="card" :actionUsed="isCardActivated(card, thisPlayer)" :cubeColor="thisPlayer.color"/>
              </div>
              <div v-for="card in getCardsByType(thisPlayer.tableau, [CardType.CEO])" :key="card.name" class="cardbox">
                <Card :card="card" :actionUsed="isCardActivated(card, thisPlayer)" :cubeColor="thisPlayer.color"/>
              </div>
              <div v-show="isVisible('ACTIVE')" v-for="card in activeTableauCards" :key="card.name" class="cardbox">
                <Card :card="card" :actionUsed="isCardActivated(card, thisPlayer)" :cubeColor="thisPlayer.color"/>
              </div>
              <StackedCards v-show="isVisible('AUTOMATED')" :cards="automatedTableauCards" />
              <StackedCards v-show="isVisible('EVENT')" :cards="eventTableauCards" />
            </div>
          </div>
        </section>
        </template>
      </section>

      <details class="tm-utility-menu">
        <summary :title="$t('Table tools')">
          <span v-i18n>Tools</span>
        </summary>
        <div class="tm-utility-panel">
          <div class="tm-tool-list">
            <div class="tm-tool-row">
              <span v-i18n>Cards</span>
              <strong>{{ cardsInHandCount }}</strong>
            </div>
            <div class="tm-tool-row">
              <span v-i18n>Blue actions</span>
              <strong>{{ thisPlayer.availableBlueCardActionCount }}</strong>
            </div>
            <div class="tm-tool-row">
              <span v-i18n>TR</span>
              <strong>{{ thisPlayer.terraformRating }}</strong>
            </div>
            <div v-if="game.spectatorId" class="tm-tool-row">
              <a :href="'/spectator?id=' + game.spectatorId" target="_blank" rel="noopener noreferrer" v-i18n>Spectator link</a>
            </div>
          </div>

          <div v-if="thisPlayer.selfReplicatingRobotsCards.length > 0" class="tm-mini-section">
            <div class="tm-panel-heading">
              <span v-i18n>Self-replicating Robots</span>
              <small>{{ thisPlayer.selfReplicatingRobotsCards.length }}</small>
            </div>
            <div class="tm-card-strip tm-card-strip--mini">
              <div v-for="card in thisPlayer.selfReplicatingRobotsCards" :key="card.name" class="cardbox">
                <Card :card="card"/>
              </div>
            </div>
          </div>

          <div v-if="thisPlayer.underworldData.tokens.length > 0" class="tm-mini-section">
            <div class="tm-panel-heading">
              <span v-i18n>Underground tokens</span>
            </div>
            <UndergroundTokens :underworldData="thisPlayer.underworldData"/>
          </div>

          <div class="tm-mini-section tm-purge-warning">
            <PurgeWarning :expectedPurgeTimeMs="game.expectedPurgeTimeMs"/>
          </div>
        </div>
      </details>

      <div v-if="activeOverlay !== 'none'" class="tm-modal-backdrop" @click.self="closeOverlay">
        <section class="tm-modal" :class="'tm-modal--' + activeOverlay">
          <header class="tm-modal-header">
            <div>
              <span v-if="modalKicker" class="tm-modal-kicker">{{ modalKicker }}</span>
              <h2>{{ modalTitle }}</h2>
            </div>
            <button type="button" class="tm-modal-close" @click="closeOverlay" aria-label="Close">X</button>
          </header>

          <div class="tm-modal-body">
            <div v-if="activeOverlay === 'board'" class="tm-board-modal-stage">
              <GameBoardView
                :game="game"
                :tileView="tileView"
                :players="playerView.players"
                @toggleTileView="cycleTileView()"
              />
            </div>

            <LogPanel
              v-if="activeOverlay === 'log'"
              :viewModel="playerView"
              :color="thisPlayer.color"
              :step="game.step"/>

            <div
              v-else-if="activeOverlay === 'cards'"
              class="tm-card-modal-grid"
              :class="['tm-card-modal-grid--' + cardOverlayFocus, {'tm-card-modal-grid--single': allCardsInHand.length === 0}]">
              <section v-if="allCardsInHand.length > 0" class="tm-modal-card-section">
                <header class="tm-modal-section-heading">
                  <h3 v-i18n>Hand</h3>
                </header>
                <div class="tm-card-gallery">
                  <div v-for="card in allCardsInHand" :key="card.name" class="cardbox">
                    <Card :card="card"/>
                  </div>
                </div>
              </section>

              <section class="tm-modal-card-section">
                <header class="tm-modal-section-heading">
                  <h3 v-i18n>Played cards</h3>
                  <div class="played-cards-filters tm-modal-filters">
                    <button type="button" :class="getHideButtonClass('ACTIVE')" @click.prevent="toggle('ACTIVE')">
                      <span class="played-cards-count">{{ activeTableauCount }}</span>
                      <span class="played-cards-selection" v-i18n>Blue</span>
                    </button>
                    <button type="button" :class="getHideButtonClass('AUTOMATED')" @click.prevent="toggle('AUTOMATED')">
                      <span class="played-cards-count">{{ automatedTableauCount }}</span>
                      <span class="played-cards-selection" v-i18n>Green</span>
                    </button>
                    <button type="button" :class="getHideButtonClass('EVENT')" @click.prevent="toggle('EVENT')">
                      <span class="played-cards-count">{{ eventTableauCount }}</span>
                      <span class="played-cards-selection" v-i18n>Events</span>
                    </button>
                  </div>
                </header>
                <div class="tm-card-gallery">
                  <div v-for="card in getCardsByType(thisPlayer.tableau, [CardType.CORPORATION])" :key="card.name" class="cardbox">
                    <Card :card="card" :actionUsed="isCardActivated(card, thisPlayer)" :cubeColor="thisPlayer.color"/>
                  </div>
                  <div v-for="card in getCardsByType(thisPlayer.tableau, [CardType.CEO])" :key="card.name" class="cardbox">
                    <Card :card="card" :actionUsed="isCardActivated(card, thisPlayer)" :cubeColor="thisPlayer.color"/>
                  </div>
                  <div v-show="isVisible('ACTIVE')" v-for="card in activeTableauCards" :key="card.name" class="cardbox">
                    <Card :card="card" :actionUsed="isCardActivated(card, thisPlayer)" :cubeColor="thisPlayer.color"/>
                  </div>
                  <StackedCards v-show="isVisible('AUTOMATED')" :cards="automatedTableauCards" />
                  <StackedCards v-show="isVisible('EVENT')" :cards="eventTableauCards" />
                </div>
              </section>
            </div>

            <div v-else-if="activeOverlay === 'player' && selectedPlayer" class="tm-player-modal-shell">
              <nav class="tm-player-tabs" aria-label="Players">
                <button
                  v-for="player in playerView.players"
                  :key="player.color"
                  type="button"
                  :class="{'tm-player-tab--active': player.color === selectedPlayer.color}"
                  @click="openPlayerTab(player.color)">
                  <span :class="'player_bg_color_' + player.color">{{ player.name }}</span>
                </button>
              </nav>

              <div class="tm-player-dossier">
                <section class="tm-player-dossier-summary">
                  <div class="tm-player-dossier-stats">
                    <div><span>VP</span><strong>{{ selectedPlayer.victoryPointsBreakdown.total }}</strong></div>
                    <div><span>TR</span><strong>{{ selectedPlayer.terraformRating }}</strong></div>
                    <div><span v-i18n>Cards</span><strong>{{ selectedPlayer.cardsInHandNbr }}</strong></div>
                  </div>
                  <PlayerResources :player="selectedPlayer"/>
                  <PlayerTags :player="selectedPlayer" :playerView="playerView" :hideZeroTags="false" :conciseTagsViewDefaultValue="false"/>
                </section>

                <section class="tm-player-dossier-cards">
                  <header class="tm-modal-section-heading">
                    <h3 v-i18n>Played cards</h3>
                    <div class="played-cards-filters tm-modal-filters">
                      <button type="button" :class="getHideButtonClass('ACTIVE')" @click.prevent="toggle('ACTIVE')">
                        <span class="played-cards-count">{{ getCardsByType(selectedPlayer.tableau, [CardType.ACTIVE]).length }}</span>
                        <span class="played-cards-selection" v-i18n>Blue</span>
                      </button>
                      <button type="button" :class="getHideButtonClass('AUTOMATED')" @click.prevent="toggle('AUTOMATED')">
                        <span class="played-cards-count">{{ getCardsByType(selectedPlayer.tableau, [CardType.AUTOMATED, CardType.PRELUDE]).length }}</span>
                        <span class="played-cards-selection" v-i18n>Green</span>
                      </button>
                      <button type="button" :class="getHideButtonClass('EVENT')" @click.prevent="toggle('EVENT')">
                        <span class="played-cards-count">{{ getCardsByType(selectedPlayer.tableau, [CardType.EVENT]).length }}</span>
                        <span class="played-cards-selection" v-i18n>Events</span>
                      </button>
                    </div>
                  </header>
                  <div class="tm-card-gallery">
                    <div v-for="card in getCardsByType(selectedPlayer.tableau, [CardType.CORPORATION])" :key="card.name" class="cardbox">
                      <Card :card="card" :actionUsed="isCardActivated(card, selectedPlayer)" :cubeColor="selectedPlayer.color"/>
                    </div>
                    <div v-for="card in getCardsByType(selectedPlayer.tableau, [CardType.CEO])" :key="card.name" class="cardbox">
                      <Card :card="card" :actionUsed="isCardActivated(card, selectedPlayer)" :cubeColor="selectedPlayer.color"/>
                    </div>
                    <div v-show="isVisible('ACTIVE')" v-for="card in sortActiveCards(getCardsByType(selectedPlayer.tableau, [CardType.ACTIVE, CardType.PRELUDE]).filter((c) => isActive(c)))" :key="card.name" class="cardbox">
                      <Card :card="card" :actionUsed="isCardActivated(card, selectedPlayer)" :cubeColor="selectedPlayer.color"/>
                    </div>
                    <StackedCards v-show="isVisible('AUTOMATED')" :cards="getCardsByType(selectedPlayer.tableau, [CardType.AUTOMATED, CardType.PRELUDE]).filter((c) => isNotActive(c))" />
                    <StackedCards v-show="isVisible('EVENT')" :cards="getCardsByType(selectedPlayer.tableau, [CardType.EVENT])" />
                  </div>
                </section>

                <section class="tm-player-dossier-log">
                  <h3 v-i18n>Activity</h3>
                  <LogPanel
                    :viewModel="playerView"
                    :color="selectedPlayer.color"
                    :step="game.step"
                    :playerFilter="selectedPlayer.color"
                    :compactHeader="true"/>
                </section>
              </div>
            </div>
          </div>
        </section>
      </div>
    </template>

    <KeyboardShortcuts v-show="keyboardShortcutOpened" @close="keyboardShortcutOpened = false"/>
  </div>
</template>

<script lang="ts">
import {defineComponent} from 'vue';

import Card from '@/client/components/card/Card.vue';
import PlayersOverview from '@/client/components/overview/PlayersOverview.vue';
import WaitingFor from '@/client/components/WaitingFor.vue';
import Colony from '@/client/components/colonies/Colony.vue';
import LogPanel from '@/client/components/logpanel/LogPanel.vue';
import LogMessageComponent from '@/client/components/logpanel/LogMessageComponent.vue';
import CardPanel from '@/client/components/logpanel/CardPanel.vue';
import GameBoardView from '@/client/components/GameBoardView.vue';
import PlayerSetupView from '@/client/components/PlayerSetupView.vue';
import PlayerResources from '@/client/components/overview/PlayerResources.vue';
import PlayerTags from '@/client/components/overview/PlayerTags.vue';
import DynamicTitle from '@/client/components/common/DynamicTitle.vue';
import SortableCards from '@/client/components/SortableCards.vue';
import StackedCards from '@/client/components/StackedCards.vue';
import PurgeWarning from '@/client/components/common/PurgeWarning.vue';
import UndergroundTokens from '@/client/components/underworld/UndergroundTokens.vue';
import KeyboardShortcuts from '@/client/components/KeyboardShortcuts.vue';
import GlobalParameterValue from '@/client/components/GlobalParameterValue.vue';
import MoonGlobalParameterValue from '@/client/components/moon/MoonGlobalParameterValue.vue';
import {getPreferences, Preferences, PreferencesManager} from '@/client/utils/PreferencesManager';
import {GameModel} from '@/common/models/GameModel';
import {PlayerViewModel, PublicPlayerModel} from '@/common/models/PlayerModel';
import {CardType} from '@/common/cards/CardType';
import {getCardsByType, isCardActivated} from '@/client/utils/CardUtils';
import {sortActiveCards} from '@/client/utils/ActiveCardsSortingOrder';
import {CardModel} from '@/common/models/CardModel';
import {getCardOrThrow} from '../cards/ClientCardManifest';
import {HomeMixin} from '@/client/mixins/HomeMixin';
import {GlobalParameter} from '@/common/GlobalParameter';
import {Color} from '@/common/Color';
import {LogMessage} from '@/common/logs/LogMessage';

type PlayerHomeModel = {
  showHand: boolean;
  showActiveCards: boolean;
  showAutomatedCards: boolean;
  showEventCards: boolean;
  activeOverlay: OverlayKind;
  selectedPlayerColor: Color | undefined;
  cardOverlayFocus: CardOverlayFocus;
  bottomTrayHeight: number | undefined;
  activityRailWidth: number | undefined;
  resizeTarget: ResizeTarget;
  activityPreviewMessage: LogMessage | undefined;
}

type OverlayKind = 'none' | 'board' | 'cards' | 'log' | 'player';
type CardOverlayFocus = 'balanced' | 'hand' | 'played';
type ResizeTarget = 'bottom' | 'activity' | undefined;

type ToggleableCardType = 'HAND' | 'ACTIVE' | 'AUTOMATED' | 'EVENT';
type ToggleStateKey = 'showHand' | 'showActiveCards' | 'showAutomatedCards' | 'showEventCards';

const typeToDataModel: Record<ToggleableCardType, {key: ToggleStateKey, preference: keyof Preferences}> = {
  HAND: {key: 'showHand', preference: 'hide_hand'},
  ACTIVE: {key: 'showActiveCards', preference: 'hide_active_cards'},
  AUTOMATED: {key: 'showAutomatedCards', preference: 'hide_automated_cards'},
  EVENT: {key: 'showEventCards', preference: 'hide_event_cards'},
} as const;

export default defineComponent({
  name: 'PlayerHome',
  mixins: [HomeMixin],
  data(): PlayerHomeModel {
    const preferences = getPreferences();
    return {
      showHand: !preferences.hide_hand,
      showActiveCards: !preferences.hide_active_cards,
      showAutomatedCards: !preferences.hide_automated_cards,
      showEventCards: !preferences.hide_event_cards,
      activeOverlay: 'none',
      selectedPlayerColor: undefined,
      cardOverlayFocus: 'balanced',
      bottomTrayHeight: undefined,
      activityRailWidth: undefined,
      resizeTarget: undefined,
      activityPreviewMessage: undefined,
    };
  },
  watch: {
    showHand: function hide_hand() {
      PreferencesManager.INSTANCE.set('hide_hand', !this.showHand);
    },
    showActiveCards: function toggle_active_cards() {
      PreferencesManager.INSTANCE.set('hide_active_cards', !this.showActiveCards);
    },
    showAutomatedCards: function toggle_automated_cards() {
      PreferencesManager.INSTANCE.set('hide_automated_cards', !this.showAutomatedCards);
    },
    showEventCards: function toggle_event_cards() {
      PreferencesManager.INSTANCE.set('hide_event_cards', !this.showEventCards);
    },
    isDecisionActive: function clear_activity_preview_when_acting(active: boolean) {
      if (active) {
        this.activityPreviewMessage = undefined;
      }
    },
  },
  props: {
    playerView: {
      type: Object as () => PlayerViewModel,
      required: true,
    },
  },
  computed: {
    thisPlayer(): PublicPlayerModel {
      return this.playerView.thisPlayer;
    },
    game(): GameModel {
      return this.playerView.game;
    },
    CardType(): typeof CardType {
      return CardType;
    },
    GlobalParameter(): typeof GlobalParameter {
      return GlobalParameter;
    },
    tableClasses(): Record<string, boolean> {
      return {
        'tm-player-table': true,
        'tm-player-table--second-pass': true,
        'tm-player-table--with-turmoil': this.game.turmoil !== undefined,
        'tm-player-table--acting': this.isPlayerActing(this.playerView),
        'tm-player-table--passive': !this.isPlayerActing(this.playerView),
        [`tm-player-table--input-${this.inputKind}`]: true,
        'tm-player-table--setup': this.thisPlayer.tableau.length === 0,
      };
    },
    tableStyle(): Record<string, string> {
      const style: Record<string, string> = {};
      if (this.bottomTrayHeight !== undefined) {
        style['--tm-bottom-height'] = `${this.bottomTrayHeight}px`;
      }
      if (this.activityRailWidth !== undefined) {
        style['--tm-activity-width'] = `${this.activityRailWidth}px`;
      }
      return style;
    },
    inputKind(): string {
      return this.playerView.waitingFor?.type ?? 'none';
    },
    isDecisionActive(): boolean {
      return this.isPlayerActing(this.playerView);
    },
    activePlayer(): PublicPlayerModel | undefined {
      return this.playerView.players.find((player) => player.isActive);
    },
    nextPlayer(): PublicPlayerModel | undefined {
      const active = this.activePlayer;
      if (active === undefined) {
        return undefined;
      }
      const notPassedPlayers = this.playerView.players.filter((player) => !this.game.passedPlayers.includes(player.color));
      if (notPassedPlayers.length < 2) {
        return undefined;
      }
      const activeIndex = notPassedPlayers.findIndex((player) => player.color === active.color);
      if (activeIndex === -1) {
        return undefined;
      }
      return notPassedPlayers[(activeIndex + 1) % notPassedPlayers.length];
    },
    selectedPlayer(): PublicPlayerModel | undefined {
      if (this.selectedPlayerColor === undefined) {
        return undefined;
      }
      return this.playerView.players.find((player) => player.color === this.selectedPlayerColor);
    },
    modalKicker(): string {
      switch (this.activeOverlay) {
      case 'board':
        return '';
      case 'cards':
        return '';
      case 'log':
        return '';
      case 'player':
        return '';
      case 'none':
        return '';
      }
    },
    modalTitle(): string {
      switch (this.activeOverlay) {
      case 'board':
        return 'Mars board';
      case 'cards':
        return 'Hand and played cards';
      case 'log':
        return 'Game log';
      case 'player':
        return this.selectedPlayer?.name ?? 'Player details';
      case 'none':
        return '';
      }
    },
    phaseLabel(): string {
      return String(this.game.phase);
    },
    generationLabel(): string {
      return `Gen ${this.game.generation}`;
    },
    turnStatusLabel(): string {
      if (this.playerView.waitingFor !== undefined && !this.playerView.waitingFor.optional) {
        return 'Your turn';
      }
      if (this.playerView.waitingFor !== undefined) {
        return 'Waiting for other players';
      }
      return 'Planning';
    },
    actionSummary(): string {
      if (this.playerView.waitingFor !== undefined && !this.playerView.waitingFor.optional) {
        return `${Math.max(0, 2 - this.thisPlayer.actionsTakenThisRound)} action slot(s)`;
      }
      return this.activePlayer === undefined ? 'watching table' : `${this.activePlayer.name} is active`;
    },
    showActivityLogPreview(): boolean {
      return this.activityPreviewMessage !== undefined && !this.isDecisionActive;
    },
    cardsInHandCount(): number {
      const playerView = this.playerView;
      return playerView.cardsInHand.length + playerView.preludeCardsInHand.length + playerView.ceoCardsInHand.length;
    },
    allCardsInHand(): Array<CardModel> {
      const playerView = this.playerView;
      return playerView.preludeCardsInHand
        .concat(playerView.ceoCardsInHand)
        .concat(playerView.cardsInHand);
    },
    activeTableauCount(): number {
      return getCardsByType(this.thisPlayer.tableau, [CardType.ACTIVE]).length;
    },
    automatedTableauCount(): number {
      return getCardsByType(this.thisPlayer.tableau, [CardType.AUTOMATED, CardType.PRELUDE]).length;
    },
    eventTableauCount(): number {
      return getCardsByType(this.thisPlayer.tableau, [CardType.EVENT]).length;
    },
    activeTableauCards(): Array<CardModel> {
      const cards = getCardsByType(this.thisPlayer.tableau, [CardType.ACTIVE, CardType.PRELUDE]);
      return [...sortActiveCards(cards.filter((c) => this.isActive(c)))];
    },
    automatedTableauCards(): Array<CardModel> {
      const cards = getCardsByType(this.thisPlayer.tableau, [CardType.AUTOMATED, CardType.PRELUDE]);
      return cards.filter((c) => this.isNotActive(c));
    },
    eventTableauCards(): Array<CardModel> {
      return [...getCardsByType(this.thisPlayer.tableau, [CardType.EVENT])];
    },
    getCardsByType(): typeof getCardsByType {
      return getCardsByType;
    },
    isCardActivated(): typeof isCardActivated {
      return isCardActivated;
    },
    sortActiveCards(): typeof sortActiveCards {
      return sortActiveCards;
    },
  },

  components: {
    DynamicTitle,
    Card,
    PlayersOverview,
    WaitingFor,
    Colony,
    LogPanel,
    LogMessageComponent,
    CardPanel,
    SortableCards,
    GameBoardView,
    PlayerSetupView,
    PlayerResources,
    PlayerTags,
    StackedCards,
    PurgeWarning,
    UndergroundTokens,
    KeyboardShortcuts,
    GlobalParameterValue,
    MoonGlobalParameterValue,
  },

  beforeUnmount() {
    this.removeLayoutResizeListeners();
  },

  methods: {
    isPlayerActing(playerView: PlayerViewModel) : boolean {
      return playerView.players.length > 1 && playerView.waitingFor !== undefined && !playerView.waitingFor.optional;
    },
    clampLayoutValue(value: number, min: number, max: number): number {
      return Math.min(max, Math.max(min, Math.round(value)));
    },
    startBottomResize(event: PointerEvent): void {
      this.beginLayoutResize('bottom', event);
    },
    startActivityResize(event: PointerEvent): void {
      this.beginLayoutResize('activity', event);
    },
    beginLayoutResize(target: Exclude<ResizeTarget, undefined>, event: PointerEvent): void {
      event.preventDefault();
      this.resizeTarget = target;
      if (event.currentTarget instanceof HTMLElement) {
        event.currentTarget.setPointerCapture?.(event.pointerId);
      }
      window.addEventListener('pointermove', this.updateLayoutResize);
      window.addEventListener('pointerup', this.stopLayoutResize, {once: true});
      this.updateLayoutResize(event);
    },
    updateLayoutResize(event: PointerEvent): void {
      if (this.resizeTarget === 'bottom') {
        const maxHeight = Math.min(430, Math.max(260, window.innerHeight - 420));
        this.bottomTrayHeight = this.clampLayoutValue(window.innerHeight - event.clientY - 8, 220, maxHeight);
      }
      if (this.resizeTarget === 'activity') {
        const maxWidth = Math.min(520, Math.max(310, window.innerWidth - 980));
        this.activityRailWidth = this.clampLayoutValue(window.innerWidth - event.clientX - 8, 260, maxWidth);
      }
    },
    stopLayoutResize(): void {
      this.resizeTarget = undefined;
      this.removeLayoutResizeListeners();
    },
    removeLayoutResizeListeners(): void {
      window.removeEventListener('pointermove', this.updateLayoutResize);
      window.removeEventListener('pointerup', this.stopLayoutResize);
    },
    openOverlay(overlay: OverlayKind): void {
      this.activeOverlay = overlay;
      if (overlay === 'cards') {
        this.cardOverlayFocus = 'balanced';
      }
    },
    openCardsOverlay(focus: CardOverlayFocus = 'balanced'): void {
      this.cardOverlayFocus = focus;
      this.activeOverlay = 'cards';
    },
    closeOverlay(): void {
      this.activeOverlay = 'none';
    },
    openActivityLogPreview(message: LogMessage): void {
      if (this.isDecisionActive) {
        this.openOverlay('log');
        return;
      }
      this.activeOverlay = 'none';
      this.activityPreviewMessage = message;
    },
    closeActivityLogPreview(): void {
      this.activityPreviewMessage = undefined;
    },
    openPlayer(color: Color): void {
      this.selectedPlayerColor = color;
      this.activeOverlay = 'player';
    },
    openPlayers(): void {
      this.selectedPlayerColor = this.playerView.players[0]?.color ?? this.thisPlayer.color;
      this.activeOverlay = 'player';
    },
    openPlayerTab(color: Color): void {
      this.selectedPlayerColor = color;
    },
    toggleCardOverlayFocus(section: 'hand' | 'played'): void {
      this.cardOverlayFocus = this.cardOverlayFocus === section ? 'balanced' : section;
    },
    focusActions(): void {
      const actions = document.querySelector('.tm-action-workbench');
      if (actions instanceof HTMLElement) {
        actions.focus({preventScroll: true});
        actions.classList.remove('tm-region-pulse');
        window.setTimeout(() => actions.classList.add('tm-region-pulse'), 0);
        window.setTimeout(() => actions.classList.remove('tm-region-pulse'), 900);
      }
    },
    getFleetsCountRange(player: PublicPlayerModel): Array<number> {
      const fleetsRange = [];
      for (let i = 0; i < player.fleetSize - player.tradesThisGeneration; i++) {
        fleetsRange.push(i);
      }
      return fleetsRange;
    },
    toggle(type: ToggleableCardType): void {
      this[typeToDataModel[type].key] = !this[typeToDataModel[type].key];
    },
    isVisible(type: ToggleableCardType): boolean {
      return this[typeToDataModel[type].key];
    },
    getToggleLabel(hideType: ToggleableCardType): string {
      const val = this[typeToDataModel[hideType].key];
      return val ? 'on' : '';
    },
    getHideButtonClass(hideType: ToggleableCardType): string {
      const prefix = 'hiding-card-button ';
      switch (hideType) {
      case 'HAND':
        return prefix + (this.showHand ? 'hand-toggle' : 'hand-toggle-transparent');
      case 'ACTIVE':
        return prefix + (this.showActiveCards ? 'active' : 'active-transparent');
      case 'AUTOMATED':
        return prefix + (this.showAutomatedCards ? 'automated' : 'automated-transparent');
      case 'EVENT':
        return prefix + (this.showEventCards ? 'event' : 'event-transparent');
      }
    },
    isActive(cardModel: CardModel): boolean {
      const card = getCardOrThrow(cardModel.name);
      return card.type === CardType.ACTIVE || card.hasAction;
    },
    isNotActive(cardModel: CardModel): boolean {
      return !getCardOrThrow(cardModel.name).hasAction;
    },
  },
});

</script>
