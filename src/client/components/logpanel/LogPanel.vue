<template>
  <div class="log-container" :class="{'log-container--compact': compactHeader, 'log-container--filtered': playerFilter !== undefined, 'log-container--external-preview': cardPanelMode === 'emit', 'log-container--has-preview': selectedMessage !== undefined && cardPanelMode === 'inline'}">
    <div class="log-generations">
      <h2 :class="getTitleClasses()">
          <span v-i18n>Game log</span>
      </h2>
      <div class="log-gen-title"  v-i18n>Gen: </div>
      <div class="log-gen-numbers">
        <div v-for="n in getGenerationsRange()" :key="n" :class="getClassesGenIndicator(n)" @click.prevent="selectGeneration(n)">
          {{ n }}
        </div>
      </div>
      <span class="label-additional" v-if="players.length === 1"><span :class="lastGenerationClass()" v-i18n>of {{lastSoloGeneration}}</span></span>
    </div>
    <div class="panel log-panel">
      <div ref="scrollablePanel" class="panel-body">
        <ul v-if="messages">
          <LogMessageComponent v-for="(message, index) in visibleMessages" :key="index" :class="getLogMessageClasses(message)" :message="message" :viewModel="viewModel" @click="messageClicked(message)" @spaceClicked="spaceClicked"/>
        </ul>
      </div>
      <div class='debugid'>(debugid {{step}})</div>
    </div>
    <CardPanel v-if="selectedMessage !== undefined && cardPanelMode === 'inline'" :message="selectedMessage" :players="players" :showClose="false"/>
  </div>
</template>

<script lang="ts">

import {defineComponent} from 'vue';
import {paths} from '@/common/app/paths';
import {LogMessage} from '@/common/logs/LogMessage';
import {LogMessageDataType} from '@/common/logs/LogMessageDataType';
import {PublicPlayerModel, ViewModel} from '@/common/models/PlayerModel';
import {playerColorClass} from '@/common/utils/utils';
import {Color} from '@/common/Color';
import {SoundManager} from '@/client/utils/SoundManager';
import {getPreferences} from '@/client/utils/PreferencesManager';
import {ParticipantId, SpaceId} from '@/common/Types';
import LogMessageComponent from '@/client/components/logpanel/LogMessageComponent.vue';
import CardPanel from '@/client/components/logpanel/CardPanel.vue';
import {isMarsSpace} from '@/common/boards/spaces';

type LogPanelModel = {
  messages: Array<LogMessage>,
  selectedGeneration: number,
  selectedMessage: LogMessage | undefined,
  lastKnownGeneration: number,
  showingRecentHistory: boolean,
  logAbortController: AbortController | undefined,
};

type CardPanelMode = 'inline' | 'emit' | 'off';

export default defineComponent({
  name: 'LogPanel',
  props: {
    viewModel: {
      type: Object as () => ViewModel,
      required: true,
    },
    color: {
      type: String as () => Color,
      required: true,
    },
    step: {
      type: Number,
      required: false,
      default: 0,
    },
    playerFilter: {
      type: String as () => Color | undefined,
      required: false,
      default: undefined,
    },
    compactHeader: {
      type: Boolean,
      required: false,
      default: false,
    },
    fallbackToAllWhenFilteredEmpty: {
      type: Boolean,
      required: false,
      default: false,
    },
    recentHistory: {
      type: Boolean,
      required: false,
      default: false,
    },
    cardPanelMode: {
      type: String as () => CardPanelMode,
      required: false,
      default: 'inline',
    },
  },
  emits: ['preview-message'],
  data(): LogPanelModel {
    return {
      messages: [],
      selectedGeneration: -1,
      selectedMessage: undefined,
      lastKnownGeneration: -1,
      showingRecentHistory: false,
      logAbortController: undefined,
    };
  },
  components: {
    LogMessageComponent,
    CardPanel,
  },
  methods: {
    messageClicked(message: LogMessage) {
      if (!this.messageHasPreview(message)) {
        return;
      }
      if (this.cardPanelMode === 'emit') {
        this.$emit('preview-message', message);
        return;
      }
      if (this.cardPanelMode === 'off') {
        return;
      }
      this.selectedMessage = this.selectedMessage === message ? undefined : message;
    },
    messageHasPreview(message: LogMessage): boolean {
      return message.data.some((datum) =>
        datum.type === LogMessageDataType.CARD ||
        datum.type === LogMessageDataType.CARDS ||
        datum.type === LogMessageDataType.GLOBAL_EVENT ||
        datum.type === LogMessageDataType.COLONY);
    },
    getLogMessageClasses(message: LogMessage): Record<string, boolean> {
      const previewable = this.cardPanelMode !== 'off' && this.messageHasPreview(message);
      return {
        'log-message--selected': previewable && this.cardPanelMode === 'inline' && this.selectedMessage === message,
      };
    },
    spaceClicked(spaceId: SpaceId) {
      const id = isMarsSpace(spaceId) ? 'shortkey-board' : 'shortkey-moonBoard';
      const el = document.getElementById(id);
      el?.scrollIntoView({block: 'center', inline: 'center', behavior: 'auto'});

      const regions = ['main_board', 'moon_board', 'moon_board_outer_spaces'];
      for (const region of regions) {
        const board = document.getElementById(region);
        if (board !== null) {
          const array = board.getElementsByClassName('board-log-highlight');
          for (let i = 0, length = array.length; i < length; i++) {
            const element = array[i] as HTMLElement;
            if (element.getAttribute('data_log_highlight_id') === spaceId) {
              element.classList.add('highlight');
              setTimeout(() => {
                element.classList.remove('highlight');
              }, 3000);
              return;
            }
          }
        }
      }
    },
    selectGeneration(gen: number): void {
      if (gen !== this.selectedGeneration) {
        this.selectedMessage = undefined;
        this.showingRecentHistory = false;
        this.getLogsForGeneration(gen);
      }
      this.selectedGeneration = gen;
    },
    getLogsForRecentHistory(): void {
      this.replaceMessages(`${paths.API_GAME_LOGS}?id=${this.id}`, this.selectedGeneration === this.generation);
    },
    getLogsForGeneration(generation: number): void {
      this.replaceMessages(`${paths.API_GAME_LOGS}?id=${this.id}&generation=${generation}`, generation === this.generation);
    },
    replaceMessages(url: string, scrollToEnd: boolean): void {
      const messages = this.messages;
      // abort any pending requests
      if (this.logAbortController) {
        this.logAbortController.abort();
        this.logAbortController = undefined;
      }

      const controller = new AbortController();
      this.logAbortController = controller;

      fetch(url, {signal: controller.signal})
        .then((resp) => {
          if (!resp.ok) {
            console.error(`error updating messages, response code ${resp.status}`);
            return null;
          }
          return resp.json();
        })
        .then((data) => {
          if (!data) {
            return;
          }
          const scrollState = this.getScrollState();
          messages.splice(0, messages.length);
          messages.push(...data);
          if (getPreferences().enable_sounds && window.location.search.includes('experimental=1') ) {
            SoundManager.newLog();
          }
          this.$nextTick(() => {
            if (scrollToEnd && scrollState.pinnedToBottom) {
              this.scrollToEnd();
            } else {
              const scrollablePanel = this.getScrollablePanel();
              if (scrollablePanel !== undefined) {
                scrollablePanel.scrollTop = scrollState.scrollTop;
              }
            }
          });
        })
        .catch((err) => {
          if (err.name === 'AbortError') {
            // ignore aborted requests
            return;
          }
          console.error('error updating messages, unable to reach server');
        })
        .finally(() => {
          if (this.logAbortController === controller) {
            this.logAbortController = undefined;
          }
        });
    },
    getScrollablePanel(): HTMLElement | undefined {
      return this.$refs.scrollablePanel as HTMLElement | undefined;
    },
    getScrollState(): {scrollTop: number, pinnedToBottom: boolean} {
      const scrollablePanel = this.getScrollablePanel();
      if (scrollablePanel === undefined) {
        return {scrollTop: 0, pinnedToBottom: true};
      }
      const distanceFromBottom = scrollablePanel.scrollHeight - scrollablePanel.clientHeight - scrollablePanel.scrollTop;
      return {
        scrollTop: scrollablePanel.scrollTop,
        pinnedToBottom: distanceFromBottom <= 4,
      };
    },
    scrollToEnd() {
      const scrollablePanel = this.getScrollablePanel();
      if (scrollablePanel !== undefined) {
        scrollablePanel.scrollTop = scrollablePanel.scrollHeight;
      }
    },
    refreshForStepChange() {
      const wasViewingLatest = this.selectedGeneration === this.lastKnownGeneration;
      this.lastKnownGeneration = this.generation;
      if (wasViewingLatest) {
        this.selectedGeneration = this.generation;
      }

      if (this.showingRecentHistory && wasViewingLatest) {
        this.getLogsForRecentHistory();
      } else {
        this.getLogsForGeneration(this.selectedGeneration);
      }
    },
    getClassesGenIndicator(gen: number): string {
      const classes = ['log-gen-indicator'];
      if (gen === this.selectedGeneration) {
        classes.push('log-gen-indicator--selected');
      }
      return classes.join(' ');
    },
    getGenerationsRange(): Array<number> {
      const generations: Array<number> = [];
      for (let i = 1; i <= this.generation; i++) {
        generations.push(i);
      }
      return generations;
    },
    getTitleClasses(): string {
      const classes = ['log-title'];
      classes.push(playerColorClass(this.color, 'shadow'));
      return classes.join(' ');
    },
    lastGenerationClass(): string {
      return this.lastSoloGeneration === this.generation ? 'last-generation blink-animation' : '';
    },
  },
  computed: {
    generation(): number {
      return this.viewModel.game.generation;
    },
    lastSoloGeneration(): number {
      return this.viewModel.game.lastSoloGeneration;
    },
    players(): Array<PublicPlayerModel> {
      return this.viewModel.players;
    },
    visibleMessages(): Array<LogMessage> {
      if (this.playerFilter === undefined) {
        return this.messages;
      }
      const player = this.players.find((p) => p.color === this.playerFilter);
      const filteredMessages = this.messages.filter((message) => {
        if (player?.id !== undefined && message.playerId === player.id) {
          return true;
        }
        return message.data.some((entry) =>
          entry.type === LogMessageDataType.PLAYER && entry.value === this.playerFilter);
      });
      if (filteredMessages.length === 0 && this.fallbackToAllWhenFilteredEmpty) {
        return this.messages;
      }
      return filteredMessages;
    },
    id(): ParticipantId | undefined {
      return this.viewModel.id;
    },
  },
  mounted() {
    this.selectedGeneration = this.generation;
    this.lastKnownGeneration = this.generation;
    this.showingRecentHistory = this.recentHistory;
    if (this.recentHistory) {
      this.getLogsForRecentHistory();
    } else {
      this.getLogsForGeneration(this.generation);
    }
  },
  beforeUnmount() {
    this.logAbortController?.abort();
    this.logAbortController = undefined;
  },
  watch: {
    step() {
      this.refreshForStepChange();
    },
  },
});

</script>
