<template>
  <div
    v-if="visibleDeltas.length > 0"
    class="tm-resource-change-list"
    role="status"
    :aria-label="announcement">
    <span
      v-for="delta in visibleDeltas"
      :key="delta.resource"
      class="tm-resource-change-group"
      :data-resource-change="delta.resource">
      <span
        v-if="delta.amount !== 0"
        class="tm-resource-change-token"
        :class="{'tm-resource-change-token--loss': delta.amount < 0}">
        <i class="resource_icon" :class="resourceIconClass(delta.resource)" aria-hidden="true"></i>
        <strong>{{ signed(delta.amount) }}</strong>
      </span>
      <span
        v-if="delta.production !== 0"
        class="tm-resource-change-token tm-resource-change-token--production"
        :class="{'tm-resource-change-token--loss': delta.production < 0}">
        <span class="production-box tm-resource-change-production-box" aria-hidden="true">
          <i class="production" :class="productionIconClass(delta.resource)"></i>
        </span>
        <strong>{{ signed(delta.production) }}</strong>
      </span>
    </span>
  </div>
</template>

<script lang="ts">
import {defineComponent} from 'vue';
import {Resource} from '@/common/Resource';
import {ResourceDelta} from '@/client/utils/ActionFeedback';

const RESOURCE_NAMES: Record<Resource, string> = {
  [Resource.MEGACREDITS]: 'MegaCredits',
  [Resource.STEEL]: 'steel',
  [Resource.TITANIUM]: 'titanium',
  [Resource.PLANTS]: 'plants',
  [Resource.ENERGY]: 'energy',
  [Resource.HEAT]: 'heat',
};

const PRODUCTION_ICON_CLASSES: Record<Resource, string> = {
  [Resource.MEGACREDITS]: 'money',
  [Resource.STEEL]: 'steel',
  [Resource.TITANIUM]: 'titanium',
  [Resource.PLANTS]: 'plant',
  [Resource.ENERGY]: 'energy',
  [Resource.HEAT]: 'heat',
};

export default defineComponent({
  name: 'PlayerResourceChanges',
  props: {
    deltas: {
      type: Array as () => Array<ResourceDelta>,
      default: () => [],
    },
  },
  computed: {
    visibleDeltas(): Array<ResourceDelta> {
      return this.deltas.filter((delta) => delta.amount !== 0 || delta.production !== 0);
    },
    announcement(): string {
      return this.visibleDeltas.flatMap((delta) => {
        const name = this.$t(RESOURCE_NAMES[delta.resource]);
        const changes = [];
        if (delta.amount !== 0) {
          changes.push(`${this.signed(delta.amount)} ${name}`);
        }
        if (delta.production !== 0) {
          changes.push(`${this.signed(delta.production)} ${name} ${this.$t('production')}`);
        }
        return changes;
      }).join(', ');
    },
  },
  methods: {
    signed(value: number): string {
      return value > 0 ? `+${value}` : String(value);
    },
    resourceIconClass(resource: Resource): string {
      return `resource_icon--${resource}`;
    },
    productionIconClass(resource: Resource): string {
      return PRODUCTION_ICON_CLASSES[resource];
    },
  },
});
</script>
