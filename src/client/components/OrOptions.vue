<template>
  <div class="wf-options wf-options--command-board" :class="{'wf-options--simple-choices': isSimpleChoiceList, 'wf-options--has-selected-submit': hasSelectedOptionSubmit, 'wf-options--has-direct-pass': directPassEntry !== undefined}">
    <div v-if="showtitle" class="wf-command-title">{{ $t(playerinput.title) }}</div>
    <div v-if="playerinput.warning !== undefined" class="card-warning wf-command-warning">({{ $t(playerinput.warning) }})</div>
    <div v-if="isMAChoiceMenu" class="wf-context-strip">
      <span v-i18n>Compare standings and funded slots before committing.</span>
      <button type="button" @click.stop.prevent="openMilestonesAndAwards" v-i18n>Inspect standings</button>
    </div>

    <div class="wf-command-grid">
      <label
        v-for="entry in commandOptions"
        :key="entry.displayedIdx"
        ref="optionLabels"
        class="form-radio wf-command-tile"
        :class="getCommandTileClass(entry.option, entry.displayedIdx)"
        @click="selectOption(entry.option, entry.displayedIdx)">
        <input v-model="selectedOption" class="wf-command-radio" type="radio" :value="entry.option" :disabled="isDisabledOption(entry.option)">
        <span class="wf-command-icon" :class="getCommandIconClass(entry.option)"></span>
        <span class="wf-command-copy">
          <span class="wf-command-option-title">{{ $t(entry.option.title) }}</span>
          <span v-if="getCommandMeta(entry.option)" class="wf-command-option-meta">{{ getCommandMeta(entry.option) }}</span>
        </span>
      </label>
    </div>

    <button
      v-if="directPassEntry !== undefined"
      type="button"
      class="wf-command-pass-action"
      @click.stop.prevent="saveDirectPass">
      <span class="wf-command-icon wf-command-icon--pass" aria-hidden="true"></span>
      <span class="wf-command-copy">
        <span class="wf-command-option-title" v-i18n>Pass for this generation</span>
        <span class="wf-command-option-meta" v-i18n>Ends your generation</span>
      </span>
    </button>

    <div
      v-if="showsave"
      class="wf-command-submit"
      :class="{
        'wf-command-submit--selected-option': hasSelectedOptionSubmit || shouldShowChoiceSubmit(),
        'wf-command-submit--empty': !hasSelectedOptionSubmit && !shouldShowChoiceSubmit(),
      }">
      <button
        v-if="hasSelectedOptionSubmit || shouldShowChoiceSubmit()"
        type="button"
        :class="selectedSubmitClass"
        @click.stop.prevent="saveSelectedOption">
        {{ $t(selectedChoiceSubmitLabel) }}
      </button>
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
import {PlayerViewModel} from '@/common/models/PlayerModel';
import {OrOptionsModel, PlayerInputModel} from '@/common/models/PlayerInputModel';
import {getPreferences} from '@/client/utils/PreferencesManager';
import {InputResponse, OrOptionsResponse} from '@/common/inputs/InputResponse';

type DisplayedOption = {
  option: PlayerInputModel;
  originalIndex: number;
}

type CommandOption = {
  option: PlayerInputModel;
  displayedIdx: number;
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
    // Standalone choices begin neutral and wait for player intent. A single
    // nested choice inside a compound action is not a decision of its own,
    // though: the parent confirmation is the consequential click. Selecting
    // that sole prerequisite keeps actions such as paid colony trades usable
    // without manufacturing a redundant "choose the only payment" step.
    const selectedIdx = this.showsave === false && displayedOptions.length === 1 ? 0 : -1;
    return {
      displayedOptions,
      originalIndices,
      selectedOption: selectedIdx === -1 ? undefined : displayedOptions[selectedIdx],
      selectedIdx,
    };
  },
  watch: {
    selectedOption(newOption: PlayerInputModel | undefined) {
      this.selectedIdx = newOption === undefined ? -1 : this.displayedOptions.indexOf(newOption);
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
    directPassEntry(): CommandOption | undefined {
      if (this.showsave !== true) {
        return undefined;
      }
      const displayedIdx = this.displayedOptions.findIndex((option) => this.isPassOption(option));
      if (displayedIdx === -1) {
        return undefined;
      }
      return {option: this.displayedOptions[displayedIdx], displayedIdx};
    },
    commandOptions(): Array<CommandOption> {
      return this.displayedOptions
        .map((option, displayedIdx) => ({option, displayedIdx}))
        .filter((entry) => entry.displayedIdx !== this.directPassEntry?.displayedIdx);
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
    isMAChoiceMenu(): boolean {
      const title = this.optionTitle(this.playerinput);
      return title.includes('milestone') || title.includes('award');
    },
    selectedSubmitClass(): Record<string, boolean> {
      return {
        'wf-command-inline-submit': !this.isSelectedPassOption,
        'wf-command-danger-submit': this.isSelectedPassOption,
      };
    },
    isSelectedPassOption(): boolean {
      return this.selectedOption !== undefined && this.isPassOption(this.selectedOption);
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

      const renderedIdx = this.commandOptions.findIndex((entry) => entry.displayedIdx === idx);
      if (renderedIdx === -1) {
        return undefined;
      }
      const val = Array.isArray(optionLabels) ? optionLabels[renderedIdx] : optionLabels;
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
    openMilestonesAndAwards() {
      const summary = document.querySelector<HTMLElement>('.tm-ma-panel-summary');
      summary?.click();
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
      if (this.isPassOption(option)) {
        return 'Pass for this generation';
      }
      if (this.optionTitle(this.playerinput).includes('award')) {
        return 'Fund award';
      }
      if (this.optionTitle(this.playerinput).includes('milestone')) {
        return 'Claim milestone';
      }
      return option.buttonLabel;
    },
    saveSelectedOption() {
      if (this.selectedOption === undefined) {
        return;
      }
      this.saveOption(this.selectedOption, this.selectedIdx);
    },
    saveDirectPass() {
      const entry = this.directPassEntry;
      if (entry === undefined) {
        return;
      }
      const idx = this.originalIndices[entry.displayedIdx];
      this.onsave({
        type: 'or',
        index: idx,
        response: {type: 'option'},
      });
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
      if (!this.canSave() || this.selectedOption === undefined) {
        return;
      }
      if (!this.hasMeaningfulChildUi(this.selectedOption)) {
        this.saveSelectedOption();
        return;
      }
      let ref = this.$refs['inputfactory'] as {saveData: () => void} | Array<{saveData: () => void}> | undefined;
      if (Array.isArray(ref)) {
        ref = ref[0];
      }
      ref?.saveData();
    },
    canSave(): boolean {
      if (this.selectedOption === undefined || this.isDisabledOption(this.selectedOption)) {
        return false;
      }
      if (!this.hasMeaningfulChildUi(this.selectedOption)) {
        return true;
      }
      let ref = this.$refs['inputfactory'] as {canSave?: () => boolean} | Array<{canSave?: () => boolean}> | undefined;
      if (Array.isArray(ref)) {
        ref = ref[0];
      }
      return ref !== undefined && (ref.canSave?.() ?? true);
    },
  },
});

</script>
