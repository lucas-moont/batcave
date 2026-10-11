// The renderer's one way to the words. Its own module, free of the bridge, so any component
// (Bat-Clawd, the emblem) can speak without pulling in the main process's API.
import { STANDARD_WORDS, type Words } from '@shared/words'

/** The words the panel and the Signal speak: the default Theme's, until Themes arrive (#74). */
export const useWords = (): Words => STANDARD_WORDS
