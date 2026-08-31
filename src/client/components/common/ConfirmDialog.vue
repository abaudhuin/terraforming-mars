<template>
  <dialog ref="dialog" class="confirm-dialog">
    <form method="dialog">
      <p v-i18n class="newlines">{{ message }}</p>
      <menu class="dialog-menu centered-content">
        <button class="btn btn-lg btn-primary confirm-dialog__accept" @click="accept()" v-i18n>Yes</button>
        <button class="btn btn-lg confirm-dialog__dismiss" @click="dismiss()" v-i18n>No</button>
      </menu>
      <template v-if="enableDontShowAgainCheckbox">
        <input type="checkbox" v-model="hide" id="dialog-confirm-dismiss" >
        <label for="dialog-confirm-dismiss" v-i18n>Don't show this again</label>
      </template>
    </form>
  </dialog>
</template>

<script lang="ts">
import {defineComponent} from 'vue';
import {hasShowModal, showModal, windowHasHTMLDialogElement} from '@/client/components/HTMLDialogElementCompatibility';

import dialogPolyfill from 'dialog-polyfill';


type Refs = {
  dialog: HTMLDialogElement;
};

export default defineComponent({
  name: 'ConfirmDialog',
  props: {
    message: {
      type: String,
      required: true,
    },
    enableDontShowAgainCheckbox: {
      type: Boolean,
      default: false,
    },
  },
  data() {
    return {
      hide: false,
      shown: false,
    };
  },
  watch: {
    hide() {
      this.$emit('hide', this.hide);
    },
  },
  computed: {
    typedRefs(): Refs {
      return this.$refs as unknown as Refs;
    },
  },
  methods: {
    close() {
      const dialog = this.typedRefs.dialog;
      dialog.classList.remove('confirm-dialog--fallback-open');
      if (typeof dialog.close === 'function' && dialog.open) {
        dialog.close();
      } else {
        dialog.removeAttribute('open');
      }
    },
    accept() {
      this.close();
      this.$emit('accept');
    },
    dismiss() {
      this.close();
      this.$emit('dismiss');
    },
    show() {
      this.shown = true;
      const dialog = this.typedRefs.dialog;
      if (hasShowModal(dialog)) {
        showModal(dialog);
        return;
      }

      // Some browsers expose HTMLDialogElement without implementing showModal.
      // Keep the confirmation visible and in-app instead of leaving the caller
      // behind an invisible gate or a browser-native prompt.
      dialog.setAttribute('open', '');
      dialog.classList.add('confirm-dialog--fallback-open');
    },
  },
  mounted() {
    if (!windowHasHTMLDialogElement()) {
      dialogPolyfill.registerDialog(this.typedRefs.dialog);
    }
  },
});
</script>
