<template>
  <div class="resource_item" :class="mainCSS" :data-resource="type">
      <div v-if="delta" class="tm-resource-change" :class="{'tm-resource-change--loss': delta.amount < 0 || delta.production < 0}" role="status" :aria-label="deltaLabel">
        <strong v-if="delta.amount !== 0">{{ signed(delta.amount) }}</strong>
        <strong v-if="delta.production !== 0" class="tm-resource-change-production"><small>P</small>{{ signed(delta.production) }}</strong>
      </div>
      <div class="resource_item_stock">
          <i class="resource_icon tooltip tooltip-bottom" :class="iconCSS" :data-tooltip="resourceTypeTooltip"></i>
          <div class="resource_item_stock_count" data-test="stock-count">{{ count }}</div>
      </div>
      <div class="resource_item_prod">
          <span class="resource_item_prod_count tooltip tooltip-bottom" data-test="production" :data-tooltip="productionCountTooltip">{{ productionSign }}{{ production }}</span>
          <div class="shield_parent" data-test="protection-shield"> <!-- Why is this a child of resource_item_prod?-->
            <div v-if="protectionIcon !== ''" :class="protectionIcon"></div>
            <div v-if="showProductionProtectedIcon" class="shield_production_protection"></div>
            <div v-if="showResourceProtectionIcon" class="shield_resource_protection"></div>
          </div>
          <div v-if="showResourceValue()" class="resource_icon--megacredit-value" data-test="resource-value">{{ value }}M€</div>
      </div>
  </div>
</template>

<script lang="ts">

import {defineComponent} from 'vue';
import {DEFAULT_STEEL_VALUE, DEFAULT_TITANIUM_VALUE} from '@/common/constants';
import {Resource} from '@/common/Resource';
import {Protection} from '@/common/models/PlayerModel';
import {ResourceDelta} from '@/client/utils/ActionFeedback';

export default defineComponent({
  name: 'PlayerResource',
  props: {
    type: {
      type: String as () => Resource,
      required: true,
    },
    count: {
      type: Number,
      required: true,
    },
    production: {
      type: Number,
      required: true,
    },
    resourceProtection: {
      type: String as () => Protection,
      required: false,
      default: 'off',
    },
    productionProtection: {
      type: String as () => Protection,
      default: 'off',
    },
    value: {
      type: Number,
      default: 0,
    },
    delta: {
      type: Object as () => ResourceDelta | undefined,
      default: undefined,
    },
  },
  data() {
    return {
    };
  },
  methods: {
    showResourceValue(): boolean {
      switch (this.type) {
      case Resource.STEEL:
        return this.value > DEFAULT_STEEL_VALUE;
      case Resource.TITANIUM:
        return this.value > DEFAULT_TITANIUM_VALUE;
      case Resource.HEAT:
        return this.value > 0;
      default:
        return false;
      }
    },
    signed(value: number): string {
      return value > 0 ? `+${value}` : String(value);
    },
  },
  computed: {
    mainCSS(): string {
      return 'resource_item--' + this.type;
    },
    iconCSS(): string {
      return 'resource_icon--' + this.type;
    },
    productionSign(): string {
      if (this.production > 0) {
        return '+';
      }
      return '';
    },
    protectionIcon(): string {
      if (this.resourceProtection === 'on') {
        return 'shield_icon';
      }
      if (this.resourceProtection === 'half') {
        return 'shield_icon_half';
      }
      if (this.productionProtection === 'on') {
        return 'shield_icon';
      }
      return '';
    },
    showProductionProtectedIcon(): boolean {
      return this.productionProtection === 'on';
    },
    showResourceProtectionIcon(): boolean {
      return this.productionProtection === 'on' && this.resourceProtection !== 'off';
    },
    resourceTypeTooltip(): string {
      if (this.type === Resource.MEGACREDITS) {
        return this.$t('MegaCredits (M€)');
      }
      return this.$t(this.type.charAt(0).toUpperCase() + this.type.slice(1));
    },
    productionCountTooltip(): string {
      return this.$t('Production count');
    },
    deltaLabel(): string {
      if (this.delta === undefined) {
        return '';
      }
      const changes = [];
      if (this.delta.amount !== 0) {
        changes.push(`${this.signed(this.delta.amount)} ${this.resourceTypeTooltip}`);
      }
      if (this.delta.production !== 0) {
        changes.push(`${this.signed(this.delta.production)} ${this.productionCountTooltip}`);
      }
      return changes.join(', ');
    },
  },
});
</script>
