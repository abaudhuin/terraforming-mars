<template>
      <div :class="getClasses()" tabindex="0">
        <div class="player-status-and-res">
        <div class="player-status">
          <div class="player-info-details">
            <div class="tm-player-identity-copy">
              <div class="player-info-name">{{ player.name }}</div>
              <span v-for="(corporationName, index) in getCorporationName()" :key="index" v-i18n>
                <div class="player-info-corp" :title="$t(corporationName)">
                  {{ corporationName }}
                </div>
              </span>
            </div>
            <button type="button" class="tm-player-view-button tm-icon-control tm-icon-control--eye" @click.stop="togglePlayerDetails" :aria-label="$t('View player details')">
              <span aria-hidden="true"></span>
            </button>
          </div>
          <div>
            <PlayerStatus :timer="player.timer" :showTimer="playerView.game.gameOptions.showTimers" :liveTimer="playerView.game.phase !== Phase.END" v-trim-whitespace :actionLabel="actionLabel"/>
          </div>
          </div>
          <PlayerResources :player="player" v-trim-whitespace />
          <div class="tm-rail-player-summary">
            <div class="tm-rail-stat tm-rail-stat--vp" title="VP">
              <span class="tm-rail-stat-icon tm-rail-stat-icon--vp" aria-hidden="true"></span>
              <span class="tm-rail-stat-label">VP</span>
              <strong>{{ player.victoryPointsBreakdown.total }}</strong>
            </div>
            <div class="tm-rail-stat tm-rail-stat--tr" title="TR">
              <span class="tm-rail-stat-icon tm-rail-stat-icon--tr" aria-hidden="true"></span>
              <span class="tm-rail-stat-label">TR</span>
              <strong>{{ player.terraformRating }}</strong>
            </div>
            <div class="tm-rail-stat tm-rail-stat--cards" :title="$t('Cards')">
              <span class="tm-rail-stat-icon tm-rail-stat-icon--cards" aria-hidden="true"></span>
              <span class="tm-rail-stat-label" v-i18n>Cards</span>
              <strong>{{ player.cardsInHandNbr }}</strong>
            </div>
          </div>
          <div class="player-played-cards">
            <div class="player-played-cards-top">
              <div class="played-cards-elements">
                <div class="played-cards-icon hiding-card-button active"></div>
                <div class="played-cards-icon hiding-card-button automated"></div>
                <div class="played-cards-icon hiding-card-button event"></div>
                <div class="played-cards-count">{{numberOfPlayedCards()}}</div>
              </div>
            </div>
            <AppButton class="played-cards-button" size="tiny" @click="togglePlayerDetails" :title="buttonLabel()" />
          </div>
          <div class="tag-display player-board-blue-action-counter" :class="tooltipCss" :data-tooltip="$t('The number of available actions on active cards')">
            <div class="tag-count tag-action-card">
              <div class="blue-stripe"></div>
              <div class="red-arrow"></div>
            </div>
            <span class="tag-count-display">{{ availableBlueActionCount() }}</span>
          </div>
        </div>
        <PlayerTags :player="player" :playerView="playerView" :hideZeroTags="hideZeroTags" :isTopBar="isTopBar" />
        <PlayerAlliedParty :player="player"/>
      </div>
</template>

<script lang="ts">
import {defineComponent} from 'vue';
import {ViewModel, PublicPlayerModel} from '@/common/models/PlayerModel';
import PlayerResources from '@/client/components/overview/PlayerResources.vue';
import PlayerTags from '@/client/components/overview/PlayerTags.vue';
import PlayerAlliedParty from '@/client/components/overview/PlayerAlliedParty.vue';
import PlayerStatus from '@/client/components/overview/PlayerStatus.vue';
import {playerColorClass} from '@/common/utils/utils';
import AppButton from '@/client/components/common/AppButton.vue';
import {CardType} from '@/common/cards/CardType';
import {getCard} from '@/client/cards/ClientCardManifest';
import {Phase} from '@/common/Phase';
import {ActionLabel} from './ActionLabel';

export default defineComponent({
  name: 'PlayerInfo',
  emits: ['open-player'],
  props: {
    player: {
      type: Object as () => PublicPlayerModel,
      required: true,
    },
    playerView: {
      type: Object as () => ViewModel,
      required: true,
    },
    firstForGen: {
      type: Boolean,
      default: false,
    },
    actionLabel: {
      type: String as () => ActionLabel,
      required: true,
    },
    playerIndex: {
      type: Number,
      required: true,
    },
    hideZeroTags: {
      type: Boolean,
      default: false,
    },
    isTopBar: {
      type: Boolean,
      default: false,
    },
  },
  components: {
    AppButton,
    PlayerResources,
    PlayerTags,
    PlayerAlliedParty,
    PlayerStatus,
  },
  computed: {
    tooltipCss(): string {
      return 'tooltip tooltip-' + (this.isTopBar ? 'bottom' : 'top');
    },
    Phase(): typeof Phase {
      return Phase;
    },
  },
  methods: {
    buttonLabel(): string {
      return 'details';
    },
    togglePlayerDetails() {
      this.$emit('open-player', this.player.color);
    },
    getClasses(): string {
      const classes = [
        'player-info',
        playerColorClass(this.player.color, 'bg_transparent'),
        this.player.color === this.playerView.thisPlayer?.color ? 'player-info--self' : 'player-info--opponent',
      ];
      if (this.player.isActive) {
        classes.push('player-info--active');
      }
      if (this.actionLabel !== 'none') {
        classes.push(`player-info--${this.actionLabel}`);
      }
      return classes.join(' ');
    },
    numberOfPlayedCards(): number {
      return this.player.tableau.length;
    },
    availableBlueActionCount(): number {
      return this.player.availableBlueCardActionCount;
    },
    getCorporationName(): string[] {
      const cards = this.player.tableau;
      const corporationCards = cards
        .filter((card) => getCard(card.name)?.type === CardType.CORPORATION)
        .map((card) => card.name);
      return corporationCards.length === 0 ? [''] : corporationCards;
    },
  },
});
</script>
