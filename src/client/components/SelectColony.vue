<template>
  <div class="wf-component wf-component--select-card wf-component--select-colony" :class="{'wf-component--trade-colony': isTradeAction}">
    <div v-if="showtitle === true && !isTradeAction" class="nofloat wf-component-title">{{ $t(playerinput.title) }}</div>

    <div v-if="isTradeAction" class="tm-colony-trade-status">
      <span class="tm-colony-trade-status-label" v-i18n>Fleet</span>
      <div class="tm-colony-trade-fleet-board">
        <div
          v-for="row in selfFleetPreviewRows"
          :key="row.color"
          class="tm-colony-player-fleets"
          :class="{'tm-colony-player-fleets--self': row.isSelf}">
          <span class="tm-colony-player-name" :class="'player_bg_color_' + row.color">{{ row.name }}</span>
          <span class="tm-colony-fleet-slots">
            <span
              v-for="slot in row.slots"
              :key="slot.index"
              class="tm-colony-fleet-token"
              :class="{'tm-colony-fleet-token--used': slot.used}"
              :title="slot.used ? $t('Fleet used') : $t('Fleet ready')">
              <span class="colonies-fleet" :class="'colonies-fleet-' + row.color"></span>
            </span>
          </span>
          <span class="tm-colony-fleet-count">{{ row.availableFleetCount }}/{{ row.fleetSize }}</span>
        </div>
      </div>
      <span class="tm-colony-selection-a11y" aria-live="polite">{{ selectedColony === undefined ? $t('No colony selected') : selectedColony }}</span>
    </div>

    <div class="tm-colony-card-strip">
      <label
        v-for="colony in (playerinput.coloniesModel || [])"
        class="cardbox tm-colony-card-option"
        :class="colonyOptionClass(colony)"
        :key="colony.name">
        <input type="radio" v-model="selectedColony" :value="colony.name" :aria-label="$t('Select') + ' ' + colony.name" >
        <span v-if="colony.visitor !== undefined" class="tm-colony-visitor-badge" :title="visitorTitle(colony)">
          <span class="tm-colony-fleet-token tm-colony-fleet-token--visitor">
            <span class="colonies-fleet" :class="visitorFleetClass(colony)"></span>
          </span>
          <span>{{ colony.visitor }}</span>
        </span>
        <span v-if="selectedColony === colony.name" class="tm-colony-card-selected-mark" v-i18n>Selected</span>
        <Colony :colony="colony"/>
      </label>
    </div>
    <div v-if="showsave === true" class="nofloat wf-component-actions">
      <AppButton @click="saveData" :title="playerinput.buttonLabel" :disabled="!canSave()"/>
    </div>
  </div>
</template>
<script lang="ts">
import {defineComponent} from 'vue';
import Colony from '@/client/components/colonies/Colony.vue';
import AppButton from '@/client/components/common/AppButton.vue';
import {ColonyModel} from '@/common/models/ColonyModel';
import {SelectColonyModel} from '@/common/models/PlayerInputModel';
import {PlayerViewModel, PublicPlayerModel} from '@/common/models/PlayerModel';
import {SelectColonyResponse} from '@/common/inputs/InputResponse';
import {ColonyName} from '@/common/colonies/ColonyName';
import {Color} from '@/common/Color';

type DataModel = {
  selectedColony: ColonyName | undefined,
};

type FleetSlot = {
  index: number;
  used: boolean;
};

type FleetPreviewRow = {
  color: Color;
  name: string;
  fleetSize: number;
  availableFleetCount: number;
  isSelf: boolean;
  slots: Array<FleetSlot>;
};

export default defineComponent({
  name: 'SelectColony',
  props: {
    playerView: {
      type: Object as () => PlayerViewModel,
      required: true,
    },
    playerinput: {
      type: Object as () => SelectColonyModel,
      required: true,
    },
    onsave: {
      type: Function as unknown as () => (out: SelectColonyResponse) => void,
      required: true,
    },
    showsave: {
      type: Boolean,
    },
    showtitle: {
      type: Boolean,
    },
  },
  data(): DataModel {
    return {
      selectedColony: undefined,
    };
  },
  components: {
    Colony,
    AppButton,
  },
  methods: {
    canSave() {
      return this.selectedColony !== undefined;
    },
    colonyOptionClass(colony: ColonyModel): Record<string, boolean> {
      return {
        'tm-colony-card-option--selected': this.selectedColony === colony.name,
        'tm-colony-card-option--visited': colony.visitor !== undefined,
      };
    },
    saveData() {
      if (this.selectedColony !== undefined) {
        this.onsave({type: 'colony', colonyName: this.selectedColony});
      }
    },
    visitorFleetClass(colony: ColonyModel): string {
      return colony.visitor === undefined ? '' : `colonies-fleet-${colony.visitor}`;
    },
    visitorTitle(colony: ColonyModel): string {
      return `${colony.visitor} fleet on ${colony.name}`;
    },
    fleetSlotsFor(player: PublicPlayerModel): Array<FleetSlot> {
      const fleetSize = Math.max(0, player.fleetSize ?? 0);
      const available = this.availableFleetCountFor(player);
      return Array.from({length: fleetSize}, (_unused, index) => ({
        index,
        used: index >= available,
      }));
    },
    availableFleetCountFor(player: PublicPlayerModel): number {
      const fleetSize = Math.max(0, player.fleetSize ?? 0);
      const usedFleetCount = Math.max(0, Math.min(fleetSize, player.tradesThisGeneration ?? 0));
      return Math.max(0, fleetSize - usedFleetCount);
    },
  },
  computed: {
    isTradeAction(): boolean {
      return this.playerinput.buttonLabel.toLowerCase() === 'trade';
    },
    fleetPreviewRows(): Array<FleetPreviewRow> {
      const self = this.playerView.thisPlayer;
      const players = this.playerView.players ?? [];
      const sourcePlayers = players.length > 0 ? players : (self === undefined ? [] : [self]);
      const rows = sourcePlayers
        .filter((player) => (player.fleetSize ?? 0) > 0)
        .map((player) => ({
          color: player.color,
          name: player.color === self?.color ? this.$t('You') : player.name,
          fleetSize: Math.max(0, player.fleetSize ?? 0),
          availableFleetCount: this.availableFleetCountFor(player),
          isSelf: player.color === self?.color,
          slots: this.fleetSlotsFor(player),
        }));

      return rows.sort((a, b) => Number(b.isSelf) - Number(a.isSelf));
    },
    selfFleetPreviewRows(): Array<FleetPreviewRow> {
      return this.fleetPreviewRows.filter((row) => row.isSelf);
    },
  },
});
</script>
