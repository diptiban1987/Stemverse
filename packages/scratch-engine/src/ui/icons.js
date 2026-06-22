import { createIcons, icons } from 'lucide';

/**
 * Initializes and refreshes Lucide icons in the DOM.
 * Call this function whenever new elements containing data-lucide attributes are added to the DOM.
 */
export function refreshIcons() {
  createIcons({ icons });
}
