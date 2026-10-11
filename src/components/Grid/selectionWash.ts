import {getTranslucentColor} from '../../lib/colors';

/**
 * Opacity of a player's colour when it is laid over a plain square (white or
 * word-highlighted), where pale bands are enough to read as a wash.
 */
export const SHARED_SELECTION_OPACITY = 0.22;

/**
 * Opacity used when the local player shares the square. These bands paint over
 * the local player's own selection fill, which is far more saturated than
 * white, so the colour has to be much stronger to still read as their stripe.
 */
export const SELECTED_OVERLAP_OPACITY = 0.72;

/**
 * Background for a square that several players share: one diagonal band per
 * colour, so everyone on the square stays visible. A single colour is a flat
 * wash instead of a stripe.
 *
 * A `null` colour leaves its band unpainted. That is how the local player's
 * selection fill shows through: the local player's own colour is already the
 * square's background (`cellStyle.selected`), so painting it again would only
 * make their band slightly muddy. The other players' bands are drawn over it.
 */
export function getSelectionWashStyle(
  colors: (string | null)[],
  opacity: number
): React.CSSProperties | null {
  if (colors.length === 0) {
    return null;
  }

  if (colors.length === 1) {
    const [only] = colors;
    return only ? {backgroundColor: getTranslucentColor(only, opacity)} : null;
  }

  const bands = colors.map((color) => (color ? getTranslucentColor(color, opacity) : 'transparent'));
  const step = 100 / bands.length;
  const stops = bands
    .map((band, index) => {
      const start = (index * step).toFixed(1);
      const end = ((index + 1) * step).toFixed(1);
      return `${band} ${start}%, ${band} ${end}%`;
    })
    .join(', ');

  return {backgroundImage: `linear-gradient(135deg, ${stops})`};
}
