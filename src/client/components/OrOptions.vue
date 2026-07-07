<template>
  <div class="wf-options wf-options--command-board" :class="{'wf-options--simple-choices': isSimpleChoiceList, 'wf-options--has-selected-submit': hasSelectedOptionSubmit}">
    <div v-if="showtitle" class="wf-command-title">{{ $t(playerinput.title) }}</div>
    <div v-if="playerinput.warning !== undefined" class="card-warning wf-command-warning">({{ $t(playerinput.warning) }})</div>

    <div class="wf-command-grid">
      <label
        v-for="(option, idx) in displayedOptions"
        :key="idx"
        ref="optionLabels"
        class="form-radio wf-command-tile"
        :class="getCommandTileClass(option, idx)"
        @click="selectOption(option, idx)">
        <input v-model="selectedOption" class="wf-command-radio" type="radio" :value="option" :disabled="isDisabledOption(option)">
        <span class="wf-command-icon" :class="getCommandIconClass(option)"></span>
        <span class="wf-command-copy">
          <span class="wf-command-option-title">{{ $t(option.title) }}</span>
          <span v-if="getCommandMeta(option)" class="wf-command-option-meta">{{ getCommandMeta(option) }}</span>
        </span>
      </label>
    </div>

    <div v-if="hasSelectedOptionSubmit" class="wf-command-submit wf-command-submit--selected-option">
      <button
        type="button"
        class="wf-command-inline-submit"
        @click.stop.prevent="saveSelectedOption">
        {{ $t(selectedChoiceSubmitLabel) }}
      </button>
    </div>

    <div v-if="shouldShowChoiceSubmit()" class="wf-command-submit">
      <AppButton type="submit" :title="selectedChoiceSubmitLabel" @click="saveSelectedOption" />
    </div>

    <div v-if="selectedOption && hasMeaningfulChildUi(selectedOption)" class="wf-command-detail">
      <PlayerInputFactory ref="inputfactory"
                            :playerView="playerView"
                            :playerinput="selectedOption"
                            :onsave="playerFactorySaved(selectedIdx)"
                            :showsave="showsave"
                            :showtitle="false" />
    </div>
  </div>
</template>

<script lang="ts">

import {defineComponent} from 'vue';
import {isHTMLElement} from '@/client/utils/vueUtils';
import AppButton from '@/client/components/common/AppButton.vue';
import {PlayerViewModel} from '@/common/models/PlayerModel';
import {OrOptionsModel, PlayerInputModel} from '@/common/models/PlayerInputModel';
import {getPreferences} from '@/client/utils/PreferencesManager';
import {InputResponse, OrOptionsResponse} from '@/common/inputs/InputResponse';

type DisplayedOption = {
  option: PlayerInputModel;
  originalIndex: number;
}

function optionTitle(option: PlayerInputModel): string {
  if (typeof option.title === 'string') {
    return option.title.toLowerCase();
  }
  return option.title.message.toLowerCase();
}

function reorderDisplayedOptions(entries: Array<DisplayedOption>): Array<DisplayedOption> {
  const ceoIndex = entries.findIndex((entry) => optionTitle(entry.option).includes('use ceo once per game action'));
  if (ceoIndex === -1) {
    return entries;
  }

  const [ceoEntry] = entries.splice(ceoIndex, 1);
  const playCardIndex = entries.findIndex((entry) => entry.option.type === 'projectCard' || optionTitle(entry.option).includes('play project card'));
  const insertIndex = playCardIndex === -1 ? Math.min(1, entries.length) : playCardIndex + 1;
  entries.splice(insertIndex, 0, ceoEntry);
  return entries;
}

export default defineComponent({
  name: 'OrOptions',
  components: {
    AppButton,
  },
  props: {
    playerView: {
      type: Object as () => PlayerViewModel,
      required: true,
    },
    playerinput: {
      type: Object as () => OrOptionsModel,
      required: true,
    },
    onsave: {
      type: Function as unknown as () => (out: OrOptionsResponse) => void,
      required: true,
    },
    showsave: {
      type: Boolean,
    },
    showtitle: {
      type: Boolean,
    },
  },
  data() {
    const entries: Array<DisplayedOption> = [];
    this.playerinput.options.forEach((option, i) => {
      if (option.type === 'card' && option.showOnlyInLearnerMode !== false && !getPreferences().learner_mode) {
        return;
      }
      entries.push({option, originalIndex: i});
    });

    reorderDisplayedOptions(entries);
    const displayedOptions = entries.map((entry) => entry.option);
    const originalIndices = entries.map((entry) => entry.originalIndex);
    const initialIdx = this.playerinput.initialIdx ?? 0;
    const displayedInitialIdx = Math.max(0, originalIndices.indexOf(initialIdx));
    // Special case: If the first recommended displayed option is SelectProjectCardToPlay, and none of them are enabled, skip it.
    let selectedIdx = displayedInitialIdx;
    if (displayedOptions.length > 1 &&
      displayedOptions[displayedInitialIdx].type === 'projectCard' &&
      !displayedOptions[displayedInitialIdx].cards.some((card) => card.isDisabled !== true)) {
      selectedIdx = displayedInitialIdx + 1;
    }
    return {
      displayedOptions,
      originalIndices,
      selectedOption: displayedOptions[selectedIdx],
      selectedIdx,
    };
  },
  watch: {
    selectedOption(newOption: PlayerInputModel) {
      this.selectedIdx = this.displayedOptions.indexOf(newOption);
      // Clicking the option can shift elements on the page.
      // This preserves the location of the option button the user just clicked by
      // tracking where it was on the screen, where it moved, and then repositioning it.
      const anchorTop = this.getSelectedOptionTop();
      this.$nextTick(() => {
        const newTop = this.getSelectedOptionTop();
        if (anchorTop !== undefined && newTop !== undefined) {
          const delta = newTop - anchorTop;
          if (Math.abs(delta) > 0.5) {
            window.scrollBy(0, delta);
          }
        }
      });
    },
  },
  computed: {
    isSimpleChoiceList(): boolean {
      return this.displayedOptions.every((option: PlayerInputModel) => option.type === 'option');
    },
    selectedChoiceSubmitLabel(): string {
      if (this.selectedOption === undefined) {
        return '';
      }
      return this.inlineSubmitLabel(this.selectedOption);
    },
    hasSelectedOptionSubmit(): boolean {
      return this.showsave === true &&
        !this.isSimpleChoiceList &&
        this.selectedOption !== undefined &&
        !this.isDisabledOption(this.selectedOption) &&
        !this.hasMeaningfulChildUi(this.selectedOption);
    },
  },
  methods: {
    getSelectedOptionTop(): number | undefined {
      const element = this.getSelectedOptionLabelElement();
      return element?.getBoundingClientRect().top;
    },
    getSelectedOptionLabelElement(): HTMLElement | undefined {
      const idx = this.selectedIdx;
      const optionLabels = this.$refs.optionLabels as HTMLElement | HTMLElement[] | undefined;
      if (idx === -1 || !optionLabels) {
        return undefined;
      }

      const val = Array.isArray(optionLabels) ? optionLabels[idx] : optionLabels;
      return isHTMLElement(val) ? val : undefined;
    },
    playerFactorySaved(displayedIdx: number) {
      const idx = this.originalIndices[displayedIdx];
      return (out: InputResponse) => {
        this.onsave({
          type: 'or',
          index: idx,
          response: out,
        });
      };
    },
    selectOption(option: PlayerInputModel, idx: number) {
      if (this.isDisabledOption(option)) {
        return;
      }
      this.selectedOption = option;
      this.selectedIdx = idx;
    },
    hasMeaningfulChildUi(option: PlayerInputModel): boolean {
      return option.type !== 'option';
    },
    shouldShowChoiceSubmit(): boolean {
      return this.showsave === true &&
        this.isSimpleChoiceList &&
        this.selectedOption !== undefined &&
        !this.isDisabledOption(this.selectedOption) &&
        !this.hasMeaningfulChildUi(this.selectedOption);
    },
    inlineSubmitLabel(option: PlayerInputModel): string {
      if (this.optionTitle(this.playerinput).includes('award')) {
        return 'Fund';
      }
      return option.buttonLabel;
    },
    saveSelectedOption() {
      if (this.selectedOption === undefined) {
        return;
      }
      this.saveOption(this.selectedOption, this.selectedIdx);
    },
    saveOption(option: PlayerInputModel, displayedIdx: number) {
      if (this.isDisabledOption(option) || option.type !== 'option') {
        return;
      }
      if (this.selectedIdx !== displayedIdx) {
        this.selectOption(option, displayedIdx);
      }
      const idx = this.originalIndices[displayedIdx];
      this.onsave({
        type: 'or',
        index: idx,
        response: {type: 'option'},
      });
    },
    getCommandTileClass(option: PlayerInputModel, idx: number): Record<string, boolean> {
      return {
        'wf-command-tile--selected': this.selectedIdx === idx,
        'wf-command-tile--pass': this.isPassOption(option),
        'wf-command-tile--disabled': this.isDisabledOption(option),
      };
    },
    getCommandIconClass(option: PlayerInputModel): string {
      const title = this.optionTitle(option);
      if (this.isPassOption(option)) {
        return 'wf-command-icon--pass';
      }
      if (option.type === 'projectCard' || title.includes('play')) {
        return 'wf-command-icon--play-card';
      }
      if (option.type === 'card' && option.selectBlueCardAction) {
        return 'wf-command-icon--blue-action';
      }
      if (title.includes('standard') || title.includes('project')) {
        return 'wf-command-icon--standard-project';
      }
      if (title.includes('oxygen')) {
        return 'wf-command-icon--oxygen';
      }
      if (title.includes('ocean')) {
        return 'wf-command-icon--ocean';
      }
      if (title.includes('venus')) {
        return 'wf-command-icon--venus';
      }
      if (title.includes('plant') || title.includes('greenery')) {
        return 'wf-command-icon--plant';
      }
      if (title.includes('heat') || title.includes('temperature')) {
        return 'wf-command-icon--temperature';
      }
      if (title.includes('milestone')) {
        return 'wf-command-icon--milestone';
      }
      if (title.includes('award')) {
        return 'wf-command-icon--award';
      }
      if (title.includes('colony') || option.type === 'colony') {
        return 'wf-command-icon--colony';
      }
      if (title.includes('delegate') || title.includes('party') || option.type === 'delegate' || option.type === 'party') {
        return 'wf-command-icon--turmoil';
      }
      if (title.includes('moon') || option.type === 'deltaProject') {
        return 'wf-command-icon--track';
      }
      return 'wf-command-icon--generic';
    },
    getCommandMeta(option: PlayerInputModel): string {
      if (option.type === 'projectCard') {
        const playable = option.cards.filter((card) => card.isDisabled !== true).length;
        return `${playable}/${option.cards.length} playable`;
      }
      if (option.type === 'card') {
        if (option.selectBlueCardAction) {
          return `${option.cards.length} action card(s)`;
        }
        if (option.min === option.max) {
          return `choose ${option.min}`;
        }
        return `choose ${option.min}-${option.max}`;
      }
      if (option.type === 'space') {
        return '';
      }
      if (option.type === 'colony') {
        return `${option.coloniesModel.length}`;
      }
      if (option.type === 'party') {
        return `${option.parties.length}`;
      }
      if (option.type === 'delegate') {
        return `${option.players.length}`;
      }
      if (option.type === 'payment') {
        return `${option.amount} M€`;
      }
      if (option.type === 'amount') {
        return `${option.min}-${option.max}`;
      }
      if (option.type === 'deltaProject') {
        return `${option.validSteps.length}`;
      }
      if (this.isPassOption(option)) {
        return '';
      }
      return option.optional ? 'optional' : '';
    },
    isPassOption(option: PlayerInputModel): boolean {
      return this.optionTitle(option).includes('pass');
    },
    isDisabledOption(option: PlayerInputModel): boolean {
      return option.type === 'projectCard' && option.cards.every((card) => card.isDisabled === true);
    },
    optionTitle(option: PlayerInputModel): string {
      return optionTitle(option);
    },
    saveData() {
      if (this.selectedOption !== undefined && !this.hasMeaningfulChildUi(this.selectedOption)) {
        this.saveSelectedOption();
        return;
      }
      let ref = this.$refs['inputfactory'] as {saveData: () => void} | Array<{saveData: () => void}>;
      if (Array.isArray(ref)) {
        ref = ref[0];
      }
      ref.saveData();
    },
  },
});

</script>
