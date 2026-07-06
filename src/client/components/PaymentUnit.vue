<template>
  <div class="payments_type input-group" :data-test="unit">
    <button class="tm-payment-resource-button" type="button" @click="$emit('plus')" :title="$t('Pay with ' + description)">
      <i class="resource_icon payments_type_icon" :class="iconClass"></i>
    </button>
    <div class="tm-payment-resource-copy">
      <strong>{{ $t(description) }}</strong>
      <span>{{ availableLabel }}</span>
    </div>
    <div class="tm-payment-stepper">
      <AppButton type="minus" @click="$emit('minus')" />
      <input
        class="form-input form-inline payments_input"
        type="number"
        min="0"
        :value="modelValue"
        @input="onInput"
      >
      <AppButton type="plus" @click="$emit('plus')" />
      <AppButton type="max" @click="$emit('max')" title="MAX" v-if="showMax" />
    </div>
    <div class="tm-payment-resource-subtotal">{{ subtotalLabel }}</div>
  </div>
</template>

<script lang="ts">
import {defineComponent} from 'vue';
import AppButton from '@/client/components/common/AppButton.vue';
import {SpendableResource} from '@/common/inputs/Spendable';

export default defineComponent({
  name: 'PaymentUnitComponent',
  props: {
    // TODO(kberg): Rename to count.
    modelValue: {
      type: Number,
      required: true,
    },
    unit: {
      type: String as () => SpendableResource,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    showMax: {
      type: Boolean,
      default: true,
      required: false,
    },
    available: {
      type: Number,
      default: 0,
    },
    rate: {
      type: Number,
      default: 1,
    },
  },
  components: {
    AppButton,
  },
  computed: {
    availableLabel(): string {
      const base = `${this.available} available`;
      if (this.rate > 1) {
        return `${base} · ${this.rate} M€ each`;
      }
      return base;
    },
    subtotalLabel(): string {
      return `${this.modelValue * this.rate} M€`;
    },
    iconClass(): string {
      switch (this.unit) {
      case 'kuiperAsteroids': return 'resource_icon--asteroid';
      case 'lunaArchivesScience': return 'resource_icon--science';
      case 'spireScience': return 'resource_icon--science';
      case 'auroraiData': return 'resource_icon--auroraidata';
      case 'seeds': return 'resource_icon--seed';
      default: return 'resource_icon--' + this.unit;
      }
    },
  },
  methods: {
    onInput(event: Event) {
      this.$emit('update:modelValue', (event.target as HTMLInputElement).value);
    },
  },
});
</script>
