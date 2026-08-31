// Some bits of the HTMLDialogElement api are not generally available or functional with most browsers
// So this just encapsulated all of the uses in one place.
//

export function windowHasHTMLDialogElement(): boolean {
  const dialogConstructor = (window as any).HTMLDialogElement;
  return dialogConstructor !== undefined &&
    typeof dialogConstructor.prototype?.showModal === 'function';
}

export function hasShowModal(dialogElement: HTMLElement) {
  const de = dialogElement as any;
  return de.showModal !== undefined && typeof(de.showModal) === 'function';
}

export function showModal(dialogElement: HTMLElement) {
  (dialogElement as any).showModal?.();
}
