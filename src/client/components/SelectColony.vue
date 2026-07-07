<template>
  <div class="wf-component wf-component--select-card wf-component--select-colony" :class="{'wf-component--trade-colony': isTradeAction}">
    <div v-if="showtitle === true" class="nofloat wf-component-title">{{ $t(playerinput.title) }}</div>

    <div v-if="isTradeAction" class="tm-colony-trade-status">
      <div class="tm-colony-trade-fleets">
        <span class="tm-colony-trade-status-label" v-i18n>Trade fleets</span>
        <span class="tm-colony-fleet-slots">
          <span
            v-for="slot in fleetSlots"
            :key="slot.index"
            class="tm-colony-fleet-token"
            :class="{'tm-colony-fleet-token--used': slot.used}"
            :title="slot.used ? $t('Fleet used') : $t('Fleet ready')">
            <span class="colonies-fleet" :class="playerFleetClass"></span>
          </span>
        </span>
        <span class="tm-colony-fleet-count">{{ availableFleetCount }}/{{ fleetSize }} <span v-i18n>ready</span></span>
      </div>

      <div v-if="visitedColonies.length > 0" class="tm-colony-visitor-list">
        <span v-for="colony in visitedColonies" :key="colony.name" class="tm-colony-visitor-chip">
          <span class="tm-colony-fleet-token tm-colony-fleet-token--visitor">
            <span class="colonies-fleet" :class="visitorFleetClass(colony)"></span>
          </span>
          <span>{{ colony.name }}</span>
        </span>
      </div>

      <div class="tm-colony-selected-summary" :class="{'tm-colony-selected-summary--empty': selectedColony === undefined}">
        <span v-if="selectedColony !== undefined">{{ selectedColony }}</span>
        <span v-else v-i18n>No colony selected</span>
      </div>
    </div>

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
import {PlayerViewModel} from '@/common/models/PlayerModel';
import {SelectColonyResponse} from '@/common/inputs/InputResponse';
import {ColonyName} from '@/common/colonies/ColonyName';

type DataModel = {
  selectedColony: ColonyName | undefined,
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
  },
  computed: {
    isTradeAction(): boolean {
      return this.playerinput.buttonLabel.toLowerCase() === 'trade';
    },
    fleetSize(): number {
      return Math.max(0, this.playerView.thisPlayer?.fleetSize ?? 0);
    },
    usedFleetCount(): number {
      return Math.max(0, Math.min(this.fleetSize, this.playerView.thisPlayer?.tradesThisGeneration ?? 0));
    },
    availableFleetCount(): number {
      return Math.max(0, this.fleetSize - this.usedFleetCount);
    },
    fleetSlots(): Array<{index: number, used: boolean}> {
      return Array.from({length: this.fleetSize}, (_unused, index) => ({
        index,
        used: index >= this.availableFleetCount,
      }));
    },
    playerFleetClass(): string {
      const color = this.playerView.thisPlayer?.color;
      return color === undefined ? '' : `colonies-fleet-${color}`;
    },
    visitedColonies(): ReadonlyArray<ColonyModel> {
      return (this.playerinput.coloniesModel || []).filter((colony) => colony.visitor !== undefined);
    },
  },
});
</script>
