<template>
  <div id="player-home" :class="tableClasses" :style="tableStyle">
    <div v-if="game.phase === 'end'" class="tm-end-overlay" role="dialog" aria-labelledby="tm-end-title">
      <div class="tm-end-banner">
        <DynamicTitle id="tm-end-title" title="This game is over!" :color="thisPlayer.color"/>
        <a class="tm-end-link" :href="'the-end?id='+ playerView.id" v-i18n>Go to game results</a>
      </div>
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
        <details class="tm-utility-menu">
          <summary :title="$t('Table tools')">
            <span v-i18n>Tools</span>
          </summary>
          <div class="tm-utility-panel">
            <div class="tm-tool-list">
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
          <button type="button" class="tm-control tm-control--review tm-control--board" @click="openOverlay('board')" v-i18n>Board</button>
          <button type="button" class="tm-control tm-control--review tm-control--cards" @click="openCardsOverlay()" v-i18n>Cards</button>
          <button type="button" class="tm-control tm-control--review tm-control--players" @click="openPlayers" v-i18n>Players</button>
        </div>
      </header>

      <main class="tm-table-main">
        <aside class="tm-player-rail" id="shortkey-playersoverview">
          <PlayersOverview :playerView="playerView" @open-player="openPlayer" v-trim-whitespace/>
        </aside>

        <section class="tm-board-stage" ref="boardStage">
          <button type="button" class="tm-board-expand-button tm-icon-control tm-icon-control--expand" @click="openOverlay('board')" :aria-label="$t('Expand board')">
            <span aria-hidden="true"></span>
          </button>
          <GameBoardView
            :game="game"
            :tileView="tileView"
            :players="playerView.players"
            @toggleTileView="cycleTileView()"
          />

          <details v-if="game.colonies.length > 0" class="tm-table-leaf tm-table-leaf--colonies" ref="colonies" id="shortkey-colonies">
            <summary class="tm-table-leaf-summary">
              <span class="tm-table-leaf-title" v-i18n>Colonies</span>
              <span class="tm-table-leaf-close tm-icon-control tm-icon-control--close" aria-hidden="true">
                <span></span>
              </span>
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
            v-if="!isActivityRailCollapsed"
            type="button"
            class="tm-layout-resize-handle tm-layout-resize-handle--activity"
            :aria-label="$t('Resize activity log')"
            @pointerdown="startActivityResize"></button>
          <div class="tm-panel-heading">
            <span v-i18n>Activity</span>
            <button v-if="!isActivityRailCollapsed" type="button" class="tm-panel-icon-button tm-icon-control tm-icon-control--eye" @click="openOverlay('log')" :aria-label="$t('Open game log')">
              <span aria-hidden="true"></span>
            </button>
            <button
              type="button"
              class="tm-panel-icon-button tm-icon-control tm-icon-control--activity-toggle"
              :class="{'tm-icon-control--activity-toggle-open': isActivityRailCollapsed}"
              @click="toggleActivityRail"
              :aria-expanded="!isActivityRailCollapsed"
              :aria-label="isActivityRailCollapsed ? $t('Show activity') : $t('Hide activity')">
              <span aria-hidden="true"></span>
            </button>
          </div>
          <LogPanel
            v-if="!isActivityRailCollapsed"
            :viewModel="playerView"
            :color="thisPlayer.color"
            :step="game.step"
            :recentHistory="true"
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
            <button type="button" class="tm-log-preview-close tm-icon-control tm-icon-control--close" @click="closeActivityLogPreview" :aria-label="$t('Close activity detail')">
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
            <button
              v-if="cardsInHandCount > 0"
              type="button"
              class="tm-action-hand-button"
              :class="{'tm-action-hand-button--open': showActionHand}"
              @click="toggleActionHand"
              :aria-expanded="showActionHand">
              <span v-i18n>Hand</span>
              <small>{{ cardsInHandCount }}</small>
            </button>
          </div>
          <WaitingFor v-if="game.phase !== 'end'" :playerView="playerView" :waitingfor="playerView.waitingFor"/>
          <section v-if="showActionHand" class="tm-action-hand-drawer" aria-label="Hand">
            <header class="tm-action-hand-header">
              <div>
                <span v-i18n>My hand</span>
                <small>{{ cardsInHandCount }}</small>
              </div>
              <button type="button" class="tm-action-hand-close tm-icon-control tm-icon-control--close" @click="closeActionHand" :aria-label="$t('Close hand')">
                <span aria-hidden="true"></span>
              </button>
            </header>
            <div class="tm-action-hand-gallery">
              <div v-for="card in allCardsInHand" :key="card.name" class="cardbox">
                <Card :card="card"/>
              </div>
            </div>
          </section>
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
              <div class="tm-card-heading-actions">
                <button type="button" :class="getHideButtonClass('HAND')" @click.prevent="toggle('HAND')">
                  <span class="played-cards-count">{{ cardsInHandCount.toString() }}</span>
                  <span class="played-cards-selection" v-i18n>{{ getToggleLabel('HAND') }}</span>
                </button>
                <button type="button" class="tm-panel-icon-button tm-icon-control tm-icon-control--eye tm-hand-open-button" @click="openCardsOverlay()" :aria-label="$t('Open hand')">
                  <span aria-hidden="true"></span>
                </button>
              </div>
            </div>
            <div v-show="isVisible('HAND') || !isDecisionActive" class="tm-card-strip">
              <SortableCards :playerId="playerView.id" :cards="allCardsInHand"/>
            </div>
          </div>

          <div class="tm-card-zone tm-card-zone--engine">
            <div class="tm-panel-heading tm-panel-heading--interactive">
              <span v-i18n>Played cards</span>
              <div class="tm-card-heading-actions played-cards-filters">
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

      <div v-if="activeOverlay !== 'none'" class="tm-modal-backdrop" @click.self="closeOverlay">
        <section class="tm-modal" :class="'tm-modal--' + activeOverlay">
          <header class="tm-modal-header" :class="{'tm-modal-header--player': activeOverlay === 'player'}">
            <nav v-if="activeOverlay === 'player' && selectedPlayer" class="tm-player-tabs tm-player-tabs--header" aria-label="Players">
              <button
                v-for="player in playerView.players"
                :key="player.color"
                type="button"
                :class="{'tm-player-tab--active': player.color === selectedPlayer.color}"
                @click="openPlayerTab(player.color)">
                <span class="tm-player-tab-name" :class="'player_bg_color_' + player.color">{{ player.name }}</span>
                <small>{{ getPlayerPrimaryCardName(player) }}</small>
              </button>
            </nav>
            <div v-else>
              <span v-if="modalKicker" class="tm-modal-kicker">{{ modalKicker }}</span>
              <h2>{{ modalTitle }}</h2>
            </div>
            <button type="button" class="tm-modal-close tm-icon-control tm-icon-control--close" @click="closeOverlay" aria-label="Close">
              <span aria-hidden="true"></span>
            </button>
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
              <section class="tm-modal-card-section">
                <header class="tm-modal-section-heading">
                  <h3 v-i18n>Hand</h3>
                  <small>{{ cardOverlayFilteredCards.length }} / {{ allCardsInHand.length }}</small>
                </header>
                <div class="tm-card-modal-toolbar cards-filter">
                  <label class="tm-card-modal-search">
                    <span v-i18n>Search</span>
                    <input type="search" v-model="cardOverlaySearch" :placeholder="$t('Search hand')">
                  </label>
                  <div class="tm-card-modal-controls tm-modal-filters">
                    <button type="button" :class="cardOverlayButtonClass(cardOverlayFilter === 'playable')" @click="setCardOverlayFilter('playable')" v-i18n>Playable</button>
                    <button type="button" :class="cardOverlayButtonClass(cardOverlayFilter === 'affordable')" @click="setCardOverlayFilter('affordable')" v-i18n>Affordable</button>
                    <button type="button" :class="cardOverlayButtonClass(cardOverlayGroup === 'type')" @click="setCardOverlayGroup('type')" v-i18n>Type</button>
                    <button type="button" :class="cardOverlayButtonClass(cardOverlayGroup === 'tag')" @click="setCardOverlayGroup('tag')" v-i18n>Tag</button>
                    <button type="button" :class="cardOverlayButtonClass(cardOverlayFilter === 'warnings')" @click="setCardOverlayFilter('warnings')" v-i18n>Warning</button>
                    <button type="button" :class="cardOverlayButtonClass(cardOverlaySort === 'cost')" @click="toggleCardOverlayCostSort()" v-i18n>Cost</button>
                    <button type="button" :class="cardOverlayButtonClass(!cardOverlayHasActiveControls)" @click="clearCardOverlayControls()" v-i18n>All</button>
                  </div>
                </div>
                <div v-if="cardOverlayFilteredCards.length === 0" class="tm-card-modal-empty" v-i18n>No cards match</div>
                <div v-else class="tm-card-gallery">
                  <div v-for="card in cardOverlayFilteredCards" :key="card.name" class="cardbox">
                    <Card :card="card"/>
                  </div>
                </div>
              </section>
            </div>

            <div v-else-if="activeOverlay === 'player' && selectedPlayer" class="tm-player-modal-shell">
              <div class="tm-player-dossier">
                <section class="tm-player-dossier-summary">
                  <div class="tm-player-dossier-stats">
                    <div class="tm-player-dossier-stat" title="VP">
                      <span class="tm-rail-stat-icon tm-rail-stat-icon--vp" aria-hidden="true"></span>
                      <span class="tm-player-dossier-stat-label">VP</span>
                      <strong>{{ selectedPlayer.victoryPointsBreakdown.total }}</strong>
                    </div>
                    <div class="tm-player-dossier-stat" title="TR">
                      <span class="tm-rail-stat-icon tm-rail-stat-icon--tr" aria-hidden="true"></span>
                      <span class="tm-player-dossier-stat-label">TR</span>
                      <strong>{{ selectedPlayer.terraformRating }}</strong>
                    </div>
                    <div class="tm-player-dossier-stat" :title="$t('Cards')">
                      <span class="tm-rail-stat-icon tm-rail-stat-icon--cards" aria-hidden="true"></span>
                      <span class="tm-player-dossier-stat-label" v-i18n>Cards</span>
                      <strong>{{ selectedPlayer.cardsInHandNbr }}</strong>
                    </div>
                  </div>
                  <PlayerResources :player="selectedPlayer"/>
                  <PlayerTags :player="selectedPlayer" :playerView="playerView" :hideZeroTags="false" :conciseTagsViewDefaultValue="false"/>
                </section>

                <section class="tm-player-dossier-cards" :class="{'tm-player-dossier-cards--with-preview': playerLogPreviewMessage !== undefined}">
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
                  <section v-if="playerLogPreviewMessage" class="tm-player-log-preview">
                    <header class="tm-player-log-preview-header">
                      <span v-i18n>Activity detail</span>
                      <button type="button" class="tm-icon-control tm-icon-control--close" @click="closePlayerLogPreview" :aria-label="$t('Close activity detail')">
                        <span aria-hidden="true"></span>
                      </button>
                    </header>
                    <div class="tm-player-log-preview-body">
                      <ul class="tm-player-log-preview-message">
                        <LogMessageComponent :message="playerLogPreviewMessage" :viewModel="playerView"/>
                      </ul>
                      <CardPanel :message="playerLogPreviewMessage" :players="playerView.players" :showClose="false"/>
                    </div>
                  </section>
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
                    :fallbackToAllWhenFilteredEmpty="true"
                    :recentHistory="true"
                    cardPanelMode="emit"
                    @preview-message="openPlayerLogPreview"
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
  showActionHand: boolean;
  isActivityRailCollapsed: boolean;
  activeOverlay: OverlayKind;
  selectedPlayerColor: Color | undefined;
  cardOverlayFocus: CardOverlayFocus;
  cardOverlaySearch: string;
  cardOverlayFilter: CardOverlayFilter;
  cardOverlayGroup: CardOverlayGroup;
  cardOverlaySort: CardOverlaySort;
  bottomTrayHeight: number | undefined;
  activityRailWidth: number | undefined;
  resizeTarget: ResizeTarget;
  boardFitZoom: number | undefined;
  boardFitYOffset: number | undefined;
  boardResizeObserver: ResizeObserver | undefined;
  activityPreviewMessage: LogMessage | undefined;
  playerLogPreviewMessage: LogMessage | undefined;
}

type OverlayKind = 'none' | 'board' | 'cards' | 'log' | 'player';
type CardOverlayFocus = 'balanced' | 'hand' | 'played';
type CardOverlayFilter = 'all' | 'playable' | 'affordable' | 'warnings';
type CardOverlayGroup = 'none' | 'type' | 'tag';
type CardOverlaySort = 'table' | 'cost';
type ResizeTarget = 'bottom' | 'activity' | undefined;

type ToggleableCardType = 'HAND' | 'ACTIVE' | 'AUTOMATED' | 'EVENT';
type ToggleStateKey = 'showHand' | 'showActiveCards' | 'showAutomatedCards' | 'showEventCards';

const layoutStorageKeys = {
  bottomTrayHeight: 'tm-player-table-bottom-tray-height',
  activityRailWidth: 'tm-player-table-activity-rail-width',
  activityRailCollapsed: 'tm-player-table-activity-rail-collapsed',
} as const;
const twoRowActionTrayHeight = 540;

function readStoredLayoutDimension(key: string): number | undefined {
  if (typeof localStorage === 'undefined') {
    return undefined;
  }
  const value = Number(localStorage.getItem(key));
  return Number.isFinite(value) && value > 0 ? value : undefined;
}

function storeLayoutDimension(key: string, value: number | undefined): void {
  if (typeof localStorage === 'undefined' || value === undefined) {
    return;
  }
  localStorage.setItem(key, String(Math.round(value)));
}

function readStoredLayoutBoolean(key: string): boolean {
  if (typeof localStorage === 'undefined') {
    return false;
  }
  return localStorage.getItem(key) === 'true';
}

function storeLayoutBoolean(key: string, value: boolean): void {
  if (typeof localStorage === 'undefined') {
    return;
  }
  localStorage.setItem(key, String(value));
}

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
      showActionHand: false,
      isActivityRailCollapsed: readStoredLayoutBoolean(layoutStorageKeys.activityRailCollapsed),
      activeOverlay: 'none',
      selectedPlayerColor: undefined,
      cardOverlayFocus: 'balanced',
      cardOverlaySearch: '',
      cardOverlayFilter: 'all',
      cardOverlayGroup: 'none',
      cardOverlaySort: 'table',
      bottomTrayHeight: readStoredLayoutDimension(layoutStorageKeys.bottomTrayHeight),
      activityRailWidth: readStoredLayoutDimension(layoutStorageKeys.activityRailWidth),
      resizeTarget: undefined,
      boardFitZoom: undefined,
      boardFitYOffset: undefined,
      boardResizeObserver: undefined,
      activityPreviewMessage: undefined,
      playerLogPreviewMessage: undefined,
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
        'tm-player-table--magnify-cards': getPreferences().magnify_cards,
        'tm-player-table--activity-collapsed': this.isActivityRailCollapsed,
        'tm-player-table--two-row-actions':
          this.bottomTrayHeight !== undefined && this.bottomTrayHeight >= twoRowActionTrayHeight,
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
      if (this.boardFitZoom !== undefined) {
        style['--tm-board-fit-zoom'] = this.boardFitZoom.toFixed(3);
      }
      if (this.boardFitYOffset !== undefined) {
        style['--tm-board-fit-y-offset'] = `${this.boardFitYOffset}px`;
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
      return `GEN ${this.game.generation}`;
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
    cardOverlayFilteredCards(): Array<CardModel> {
      const term = this.cardOverlaySearch.trim().toLocaleLowerCase();
      return this.allCardsInHand
        .filter((card) => this.cardMatchesOverlayControls(card, term))
        .sort((a, b) => this.compareOverlayCards(a, b));
    },
    cardOverlayHasActiveControls(): boolean {
      return this.cardOverlaySearch.trim() !== '' ||
        this.cardOverlayFilter !== 'all' ||
        this.cardOverlayGroup !== 'none' ||
        this.cardOverlaySort !== 'table';
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
    GameBoardView,
    PlayerSetupView,
    PlayerResources,
    PlayerTags,
    SortableCards,
    StackedCards,
    PurgeWarning,
    UndergroundTokens,
    KeyboardShortcuts,
    GlobalParameterValue,
    MoonGlobalParameterValue,
  },

  mounted() {
    document.addEventListener('keydown', this.handleGlobalKeydown);
    this.$nextTick(this.installBoardFitObserver);
  },

  beforeUnmount() {
    document.removeEventListener('keydown', this.handleGlobalKeydown);
    this.removeLayoutResizeListeners();
    this.removeBoardFitObserver();
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
        const minHeight = window.innerHeight < 820 ? 240 : 300;
        const maxHeight = Math.min(Math.round(window.innerHeight * 0.62), Math.max(minHeight, window.innerHeight - 170));
        this.bottomTrayHeight = this.clampLayoutValue(window.innerHeight - event.clientY - 8, minHeight, maxHeight);
      }
      if (this.resizeTarget === 'activity') {
        const maxWidth = Math.min(820, Math.max(280, window.innerWidth - 620));
        this.activityRailWidth = this.clampLayoutValue(window.innerWidth - event.clientX - 8, 220, maxWidth);
      }
    },
    stopLayoutResize(): void {
      const target = this.resizeTarget;
      if (target === 'bottom') {
        storeLayoutDimension(layoutStorageKeys.bottomTrayHeight, this.bottomTrayHeight);
      }
      if (target === 'activity') {
        storeLayoutDimension(layoutStorageKeys.activityRailWidth, this.activityRailWidth);
      }
      this.resizeTarget = undefined;
      this.removeLayoutResizeListeners();
    },
    removeLayoutResizeListeners(): void {
      window.removeEventListener('pointermove', this.updateLayoutResize);
      window.removeEventListener('pointerup', this.stopLayoutResize);
    },
    installBoardFitObserver(): void {
      const boardStage = this.$refs.boardStage;
      if (!(boardStage instanceof HTMLElement)) {
        return;
      }
      this.removeBoardFitObserver();
      if (typeof ResizeObserver !== 'undefined') {
        this.boardResizeObserver = new ResizeObserver(this.updateBoardFit);
        this.boardResizeObserver.observe(boardStage);
      }
      window.addEventListener('resize', this.updateBoardFit);
      this.updateBoardFit();
    },
    removeBoardFitObserver(): void {
      this.boardResizeObserver?.disconnect();
      this.boardResizeObserver = undefined;
      window.removeEventListener('resize', this.updateBoardFit);
    },
    updateBoardFit(): void {
      const boardStage = this.$refs.boardStage;
      if (!(boardStage instanceof HTMLElement)) {
        return;
      }
      const rect = boardStage.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) {
        return;
      }

      const boardNaturalWidth = 670;
      const boardNaturalHeight = 620;
      const horizontalPadding = 34;
      const verticalPadding = 54;
      const fitByWidth = (rect.width - horizontalPadding) / boardNaturalWidth;
      const fitByHeight = (rect.height - verticalPadding) / boardNaturalHeight;
      const maxZoom = window.innerHeight < 820 ? 1.16 : 1.48;
      const minZoom = window.innerHeight < 820 ? 0.30 : 0.42;
      const zoom = this.clampLayoutValue(Math.min(fitByWidth, fitByHeight) * 1000, minZoom * 1000, maxZoom * 1000) / 1000;
      const visualYOffset = Math.max(zoom * 10, (1.08 - zoom) * 80);
      const yOffset = this.clampLayoutValue(visualYOffset, 0, 32);

      if (this.boardFitZoom !== zoom) {
        this.boardFitZoom = zoom;
      }
      if (this.boardFitYOffset !== yOffset) {
        this.boardFitYOffset = yOffset;
      }
    },
    handleGlobalKeydown(event: KeyboardEvent): void {
      if (event.key !== 'Escape') {
        return;
      }
      if (this.activeOverlay !== 'none') {
        event.preventDefault();
        this.closeOverlay();
        return;
      }
      if (this.activityPreviewMessage !== undefined) {
        event.preventDefault();
        this.closeActivityLogPreview();
        return;
      }
      if (this.showActionHand) {
        event.preventDefault();
        this.closeActionHand();
        return;
      }
      if (this.playerLogPreviewMessage !== undefined) {
        event.preventDefault();
        this.closePlayerLogPreview();
        return;
      }
      const openPanels = Array.from(this.$el.querySelectorAll('details[open]'));
      const openPanel = openPanels[openPanels.length - 1];
      if (openPanel instanceof HTMLDetailsElement) {
        event.preventDefault();
        openPanel.open = false;
      }
    },
    openOverlay(overlay: OverlayKind): void {
      this.activeOverlay = overlay;
      this.closeActionHand();
      if (overlay === 'cards') {
        this.cardOverlayFocus = 'hand';
      }
    },
    openCardsOverlay(): void {
      this.cardOverlayFocus = 'hand';
      this.activeOverlay = 'cards';
      this.closeActionHand();
    },
    closeOverlay(): void {
      this.activeOverlay = 'none';
      this.playerLogPreviewMessage = undefined;
    },
    openActivityLogPreview(message: LogMessage): void {
      if (this.isDecisionActive) {
        this.openOverlay('log');
        return;
      }
      if (this.activityPreviewMessage === message || this.isSameLogPreview(this.activityPreviewMessage, message)) {
        this.closeActivityLogPreview();
        return;
      }
      this.activeOverlay = 'none';
      this.activityPreviewMessage = message;
    },
    closeActivityLogPreview(): void {
      this.activityPreviewMessage = undefined;
    },
    openPlayerLogPreview(message: LogMessage): void {
      if (this.playerLogPreviewMessage === message || this.isSameLogPreview(this.playerLogPreviewMessage, message)) {
        this.closePlayerLogPreview();
        return;
      }
      this.playerLogPreviewMessage = message;
    },
    closePlayerLogPreview(): void {
      this.playerLogPreviewMessage = undefined;
    },
    toggleActionHand(): void {
      this.showActionHand = !this.showActionHand;
    },
    closeActionHand(): void {
      this.showActionHand = false;
    },
    toggleActivityRail(): void {
      this.isActivityRailCollapsed = !this.isActivityRailCollapsed;
      if (this.isActivityRailCollapsed) {
        this.closeActivityLogPreview();
      }
      storeLayoutBoolean(layoutStorageKeys.activityRailCollapsed, this.isActivityRailCollapsed);
    },
    openPlayer(color: Color): void {
      this.selectedPlayerColor = color;
      this.playerLogPreviewMessage = undefined;
      this.activeOverlay = 'player';
    },
    openPlayers(): void {
      this.selectedPlayerColor = this.playerView.players[0]?.color ?? this.thisPlayer.color;
      this.playerLogPreviewMessage = undefined;
      this.activeOverlay = 'player';
    },
    openPlayerTab(color: Color): void {
      this.selectedPlayerColor = color;
      this.playerLogPreviewMessage = undefined;
    },
    getPlayerPrimaryCardName(player: PublicPlayerModel): string {
      return getCardsByType(player.tableau, [CardType.CORPORATION, CardType.CEO])[0]?.name ?? '';
    },
    isSameLogPreview(current: LogMessage | undefined, next: LogMessage): boolean {
      return current !== undefined &&
        current.message === next.message &&
        current.timestamp === next.timestamp &&
        JSON.stringify(current.data) === JSON.stringify(next.data);
    },
    toggleCardOverlayFocus(section: 'hand' | 'played'): void {
      this.cardOverlayFocus = this.cardOverlayFocus === section ? 'balanced' : section;
    },
    setCardOverlayFilter(filter: Exclude<CardOverlayFilter, 'all'>): void {
      this.cardOverlayFilter = this.cardOverlayFilter === filter ? 'all' : filter;
    },
    setCardOverlayGroup(group: Exclude<CardOverlayGroup, 'none'>): void {
      this.cardOverlayGroup = this.cardOverlayGroup === group ? 'none' : group;
    },
    toggleCardOverlayCostSort(): void {
      this.cardOverlaySort = this.cardOverlaySort === 'cost' ? 'table' : 'cost';
    },
    clearCardOverlayControls(): void {
      this.cardOverlaySearch = '';
      this.cardOverlayFilter = 'all';
      this.cardOverlayGroup = 'none';
      this.cardOverlaySort = 'table';
    },
    cardOverlayButtonClass(active: boolean): Record<string, boolean> {
      return {
        'tm-card-modal-control': true,
        'tm-card-modal-control--active': active,
      };
    },
    cardMatchesOverlayControls(card: CardModel, term: string): boolean {
      const cardDefinition = getCardOrThrow(card.name);
      const haystack = [
        card.name,
        cardDefinition.type,
        cardDefinition.module,
        ...cardDefinition.tags,
      ].join(' ').toLocaleLowerCase();
      if (term !== '' && !haystack.includes(term)) {
        return false;
      }
      switch (this.cardOverlayFilter) {
      case 'playable':
        return card.isDisabled !== true;
      case 'affordable':
        return card.isDisabled !== true && this.cardOverlayCost(card) <= this.cardOverlayBuyingPower();
      case 'warnings':
        return card.isDisabled === true || (card.warnings?.length ?? 0) > 0;
      case 'all':
        return true;
      }
    },
    compareOverlayCards(first: CardModel, second: CardModel): number {
      if (this.cardOverlayGroup === 'type') {
        const typeOrder = this.cardOverlayType(first).localeCompare(this.cardOverlayType(second));
        if (typeOrder !== 0) return typeOrder;
      }
      if (this.cardOverlayGroup === 'tag') {
        const tagOrder = this.cardOverlayPrimaryTag(first).localeCompare(this.cardOverlayPrimaryTag(second));
        if (tagOrder !== 0) return tagOrder;
      }
      if (this.cardOverlaySort === 'cost') {
        const costOrder = this.cardOverlayCost(first) - this.cardOverlayCost(second);
        if (costOrder !== 0) return costOrder;
      }
      return String(first.name).localeCompare(String(second.name));
    },
    cardOverlayType(card: CardModel): string {
      return getCardOrThrow(card.name).type;
    },
    cardOverlayPrimaryTag(card: CardModel): string {
      return getCardOrThrow(card.name).tags[0] ?? 'none';
    },
    cardOverlayCost(card: CardModel): number {
      return card.calculatedCost ?? getCardOrThrow(card.name).cost ?? 0;
    },
    cardOverlayBuyingPower(): number {
      return this.thisPlayer.megacredits +
        this.thisPlayer.steel * this.thisPlayer.steelValue +
        this.thisPlayer.titanium * this.thisPlayer.titaniumValue;
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
