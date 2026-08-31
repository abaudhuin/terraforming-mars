<template>
  <section
    class="tm-action-spotlight"
    :class="{'tm-action-spotlight--empty': messages.length === 0}"
    aria-live="polite">
    <header v-if="messages.length > 0" class="tm-action-spotlight-header">
      <div class="tm-action-spotlight-heading">
        <span class="tm-action-spotlight-kicker" v-i18n>Latest action</span>
        <strong v-if="actor" class="tm-action-spotlight-actor" :class="'player_bg_color_' + actor.color">{{ actor.name }}</strong>
      </div>
    </header>

    <div v-if="messages.length === 0" class="tm-action-spotlight-empty">
      <span aria-hidden="true">—</span>
      <span class="tm-visually-hidden" v-i18n>Waiting for activity</span>
    </div>

    <template v-else>
      <div class="tm-action-spotlight-content" :class="spotlightContentClasses">
        <ul class="tm-action-spotlight-messages">
          <LogMessageComponent
            v-for="(message, index) in visibleMessages"
            :key="message.timestamp + '-' + index"
            :message="message"
            :viewModel="viewModel"/>
        </ul>
        <div v-if="featuredVisuals.length > 0" class="tm-action-spotlight-browser">
          <div class="tm-action-spotlight-object">
            <div class="tm-action-spotlight-object-track">
              <CardPanel
                v-for="(visual, index) in featuredVisuals"
                :key="visual.message.timestamp + '-' + index"
                :message="visual.message"
                :players="viewModel.players"
                :cardOutcomes="visual.cardOutcomes"
                :showClose="false"/>
            </div>
          </div>
        </div>
      </div>
    </template>
  </section>
</template>

<script lang="ts">
import {defineComponent} from 'vue';
import {LogMessage} from '@/common/logs/LogMessage';
import {LogMessageDataType} from '@/common/logs/LogMessageDataType';
import {ViewModel, PublicPlayerModel} from '@/common/models/PlayerModel';
import LogMessageComponent from '@/client/components/logpanel/LogMessageComponent.vue';
import CardPanel from '@/client/components/logpanel/CardPanel.vue';

type CardOutcome = 'Played' | 'Revealed' | 'Kept' | 'Discarded' | 'Drawn';
type FeaturedVisual = {
  message: LogMessage;
  cardOutcomes: Array<CardOutcome>;
};

export default defineComponent({
  name: 'ActionSpotlight',
  props: {
    messages: {
      type: Array as () => Array<LogMessage>,
      required: true,
    },
    viewModel: {
      type: Object as () => ViewModel,
      required: true,
    },
  },
  components: {
    LogMessageComponent,
    CardPanel,
  },
  computed: {
    visibleMessages(): Array<LogMessage> {
      return this.messages;
    },
    primaryMessage(): LogMessage | undefined {
      return this.featuredVisuals[0]?.message ?? this.visibleMessages[0];
    },
    featuredMessages(): Array<LogMessage> {
      return this.featuredVisuals.map((visual) => visual.message);
    },
    featuredVisuals(): Array<FeaturedVisual> {
      const revealedCards = new Set(
        this.visibleMessages
          .filter((message) => this.messageKind(message) === 'revealed')
          .flatMap((message) => this.cardsFor(message)),
      );
      const retainedCards = new Set(
        this.visibleMessages
          .filter((message) => this.messageKind(message) === 'retained')
          .flatMap((message) => this.cardsFor(message)),
      );

      return this.visibleMessages.flatMap((message): Array<FeaturedVisual> => {
        if (!this.messageHasVisual(message)) {
          return [];
        }

        const cards = this.cardsFor(message);
        const kind = this.messageKind(message);
        if (kind === 'retained' && cards.length > 0 && cards.every((card) => revealedCards.has(card))) {
          // The revealed panel already contains these cards and can describe
          // both outcomes without rendering the kept subset a second time.
          return [];
        }

        let cardOutcomes: Array<CardOutcome> = [];
        if (kind === 'played') {
          cardOutcomes = cards.map(() => 'Played');
        } else if (kind === 'revealed') {
          cardOutcomes = cards.map((card) => retainedCards.has(card) ? 'Kept' : 'Discarded');
        } else if (kind === 'discarded') {
          cardOutcomes = cards.map(() => 'Discarded');
        } else if (kind === 'retained') {
          const outcome: CardOutcome = /\bdrew\b/.test(message.message.toLowerCase()) && revealedCards.size === 0 ? 'Drawn' : 'Kept';
          cardOutcomes = cards.map(() => outcome);
        } else {
          cardOutcomes = cards.map(() => 'Drawn');
        }

        return [{message, cardOutcomes}];
      });
    },
    featuredVisualCount(): number {
      return this.featuredMessages.reduce((total, message) => {
        return total + message.data.reduce((count, datum) => {
          if (datum.type === LogMessageDataType.CARDS) {
            return count + datum.value.length;
          }
          if (datum.type === LogMessageDataType.CARD ||
              datum.type === LogMessageDataType.COLONY ||
              datum.type === LogMessageDataType.GLOBAL_EVENT) {
            return count + 1;
          }
          return count;
        }, 0);
      }, 0);
    },
    spotlightContentClasses(): Record<string, boolean> {
      return {
        'tm-action-spotlight-content--visual-single': this.featuredVisualCount === 1,
        'tm-action-spotlight-content--visual-stack': this.featuredVisualCount > 1,
      };
    },
    actor(): PublicPlayerModel | undefined {
      const datum = this.primaryMessage?.data.find((entry) => entry.type === LogMessageDataType.PLAYER);
      if (datum?.type !== LogMessageDataType.PLAYER) {
        return undefined;
      }
      return this.viewModel.players.find((player) => player.color === datum.value);
    },
  },
  methods: {
    cardsFor(message: LogMessage): Array<string> {
      return message.data
        .filter((datum) => datum.type === LogMessageDataType.CARD || datum.type === LogMessageDataType.CARDS)
        .flatMap((datum) => datum.type === LogMessageDataType.CARD ? [datum.value] : [...datum.value]);
    },
    messageKind(message: LogMessage): 'played' | 'revealed' | 'retained' | 'discarded' | 'other' {
      const text = message.message.toLowerCase();
      if (/\bplayed\b/.test(text)) return 'played';
      if (/\brevealed\b/.test(text)) return 'revealed';
      if (/\bdiscarded\b/.test(text)) return 'discarded';
      if (/\b(drew|bought|kept|selected|took)\b/.test(text)) return 'retained';
      return 'other';
    },
    messageHasVisual(message: LogMessage): boolean {
      return message.data.some((datum) =>
        datum.type === LogMessageDataType.CARD ||
        datum.type === LogMessageDataType.CARDS ||
        datum.type === LogMessageDataType.COLONY ||
        datum.type === LogMessageDataType.GLOBAL_EVENT);
    },
  },
});
</script>
