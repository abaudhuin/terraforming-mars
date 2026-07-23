<template>
  <section class="tm-action-spotlight" :class="{'tm-action-spotlight--empty': messages.length === 0}" aria-live="polite">
    <header v-if="actor || globalDeltas.length > 0" class="tm-action-spotlight-header">
      <strong v-if="actor" class="tm-action-spotlight-actor" :class="'player_bg_color_' + actor.color">{{ actor.name }}</strong>
      <div v-if="globalDeltas.length > 0" class="tm-action-spotlight-deltas">
        <div v-for="delta in globalDeltas" :key="delta.parameter" class="tm-action-delta tm-action-delta--global" :title="globalLabel(delta.parameter)">
          <span>{{ globalSymbol(delta.parameter) }}</span>
          <strong>{{ signed(delta.amount) }}</strong>
        </div>
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
        <div v-if="featuredMessage" class="tm-action-spotlight-object">
          <CardPanel :message="featuredMessage" :players="viewModel.players" :showClose="false"/>
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
import {GlobalParameter} from '@/common/GlobalParameter';
import {GlobalDelta} from '@/client/utils/ActionFeedback';
import LogMessageComponent from '@/client/components/logpanel/LogMessageComponent.vue';
import CardPanel from '@/client/components/logpanel/CardPanel.vue';

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
    globalDeltas: {
      type: Array as () => Array<GlobalDelta>,
      required: false,
      default: () => [],
    },
  },
  components: {
    LogMessageComponent,
    CardPanel,
  },
  computed: {
    visibleMessages(): Array<LogMessage> {
      return this.messages.slice(-12);
    },
    primaryMessage(): LogMessage | undefined {
      return this.featuredMessage ?? this.visibleMessages[0];
    },
    featuredMessage(): LogMessage | undefined {
      const playedCard = [...this.visibleMessages].reverse().find((message) =>
        /\bplayed\b/i.test(message.message) && this.messageHasVisual(message));
      return playedCard ?? [...this.visibleMessages].reverse().find((message) => this.messageHasVisual(message));
    },
    featuredVisualCount(): number {
      return this.featuredMessage?.data.reduce((count, datum) => {
        if (datum.type === LogMessageDataType.CARDS) {
          return count + datum.value.length;
        }
        if (datum.type === LogMessageDataType.CARD ||
            datum.type === LogMessageDataType.COLONY ||
            datum.type === LogMessageDataType.GLOBAL_EVENT) {
          return count + 1;
        }
        return count;
      }, 0) ?? 0;
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
    messageHasVisual(message: LogMessage): boolean {
      return message.data.some((datum) =>
        datum.type === LogMessageDataType.CARD ||
        datum.type === LogMessageDataType.CARDS ||
        datum.type === LogMessageDataType.COLONY ||
        datum.type === LogMessageDataType.GLOBAL_EVENT);
    },
    signed(value: number): string {
      return value > 0 ? `+${value}` : String(value);
    },
    globalSymbol(parameter: GlobalParameter): string {
      switch (parameter) {
      case GlobalParameter.TEMPERATURE:
        return '°';
      case GlobalParameter.OXYGEN:
        return 'O₂';
      case GlobalParameter.OCEANS:
        return '◉';
      case GlobalParameter.VENUS:
        return 'V';
      default:
        return '•';
      }
    },
    globalLabel(parameter: GlobalParameter): string {
      switch (parameter) {
      case GlobalParameter.TEMPERATURE:
        return this.$t('Temperature');
      case GlobalParameter.OXYGEN:
        return this.$t('Oxygen');
      case GlobalParameter.OCEANS:
        return this.$t('Oceans');
      case GlobalParameter.VENUS:
        return this.$t('Venus');
      default:
        return String(parameter);
      }
    },
  },
});
</script>
