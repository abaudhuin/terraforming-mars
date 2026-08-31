<template>
  <div class="card-panel" :class="{'card-panel--embedded': !showClose}" v-if="message !== undefined && show">
    <AppButton v-if="showClose" size="big" type="close" :disableOnServerBusy="false" @click="hideMe" align="right"/>
    <div
      class="log-panel-card cardbox"
      :class="cardOutcomeClass(index)"
      :data-card-outcome="cardOutcomes[index]?.toLowerCase()"
      v-for="(name, index) in cards"
      :key="name">
      <span v-if="cardOutcomes[index]" class="tm-card-outcome">{{ cardOutcomes[index] }}</span>
      <Card :card="{name, isSelfReplicatingRobotsCard: isSelfReplicatingRobotsCard(name), resources: getResourcesOnCard(name)}"/>
    </div>
    <div class="log-panel-card cardbox" v-for="name in globalEvents" :key="name">
      <GlobalEvent :globalEventName="name" type="prior" :showIcons="false"/>
    </div>
    <div class="log-panel-card cardbox" v-for="name in colonies" :key="name">
      <Colony :colony="getColony(name)"/>
    </div>
  </div>
</template>

<script lang="ts">

import {defineComponent} from 'vue';
import {LogMessage} from '@/common/logs/LogMessage';
import {LogMessageDataType} from '@/common/logs/LogMessageDataType';
import {CardName} from '@/common/cards/CardName';
import {ColonyName} from '@/common/colonies/ColonyName';
import {ColonyModel, simpleColonyModel} from '@/common/models/ColonyModel';
import {PublicPlayerModel} from '@/common/models/PlayerModel';
import Card from '@/client/components/card/Card.vue';
import GlobalEvent from '@/client/components/turmoil/GlobalEvent.vue';
import AppButton from '@/client/components/common/AppButton.vue';
import Colony from '@/client/components/colonies/Colony.vue';
import {GlobalEventName} from '@/common/turmoil/globalEvents/GlobalEventName';

export default defineComponent({
  name: 'CardPanel',
  props: {
    message: {
      type: Object as () => LogMessage,
      required: true,
    },
    players: {
      type: Array as () => Array<PublicPlayerModel>,
      required: true,
    },
    showClose: {
      type: Boolean,
      required: false,
      default: true,
    },
    cardOutcomes: {
      type: Array as () => Array<string>,
      required: false,
      default: () => [],
    },
  },
  components: {
    AppButton,
    Card,
    Colony,
    GlobalEvent,
  },
  computed: {
    show(): boolean {
      return this.cards.length + this.globalEvents.length + this.colonies.length > 0;
    },
    cards(): ReadonlyArray<CardName> {
      return this.message.data
        .filter((datum) => datum.type === LogMessageDataType.CARD || datum.type === LogMessageDataType.CARDS)
        .flatMap((datum) => datum.type === LogMessageDataType.CARD ? [datum.value] : datum.value);
    },
    globalEvents(): Array<GlobalEventName> {
      return this.message.data.filter((datum) => datum.type === LogMessageDataType.GLOBAL_EVENT).map((datum) => datum.value);
    },
    colonies(): Array<ColonyName> {
      return this.message.data.filter((datum) => datum.type === LogMessageDataType.COLONY).map((datum) => datum.value);
    },
  },
  methods: {
    cardOutcomeClass(index: number): Record<string, boolean> {
      const outcome = this.cardOutcomes[index]?.toLowerCase();
      return {
        'log-panel-card--labeled': outcome !== undefined,
        [`log-panel-card--${outcome}`]: outcome !== undefined,
      };
    },
    hideMe() {
      this.$emit('hide');
    },
    getColony(name: ColonyName): ColonyModel {
      return simpleColonyModel(name);
    },
    isSelfReplicatingRobotsCard(cardName: CardName) {
      for (const player of this.players) {
        if (player.selfReplicatingRobotsCards.some((card) => card.name === cardName)) {
          return true;
        }
      }
      return false;
    },
    getResourcesOnCard(cardName: CardName) {
      for (const player of this.players) {
        const playedCard = player.tableau.find((card) => card.name === cardName);
        if (playedCard !== undefined) {
          return playedCard.resources;
        }
        const srrCard = player.selfReplicatingRobotsCards.find((card) => card.name === cardName);
        if (srrCard !== undefined) {
          return srrCard.resources;
        }
      }

      return undefined;
    },
  },
});

</script>
