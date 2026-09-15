import {
  toHex,
  darken,
  lightenHsl,
  getTranslucentColor,
  getContrastTextColor,
  MAIN_BLUE_3,
  GREENISH,
  PINKISH,
} from '../colors';

describe('toHex', () => {
  it('converts numeric color to hex string', () => {
    expect(toHex(0xff0000)).toBe('#ff0000');
    expect(toHex(0x00ff00)).toBe('#00ff00');
    expect(toHex(0x0000ff)).toBe('#0000ff');
  });

  it('pads with leading zeros', () => {
    expect(toHex(0x000000)).toBe('#000000');
    expect(toHex(0x0000ff)).toBe('#0000ff');
  });

  it('converts named constants', () => {
    expect(toHex(MAIN_BLUE_3)).toBe('#dcefff');
    expect(toHex(GREENISH)).toBe('#1fff3d');
    expect(toHex(PINKISH)).toBe('#f0dbff');
  });

  it('handles white and black', () => {
    expect(toHex(0xffffff)).toBe('#ffffff');
    expect(toHex(0x000000)).toBe('#000000');
  });
});

describe('darken', () => {
  it('reduces RGB values by 5%', () => {
    // Pure red: (255, 0, 0) → (242, 0, 0)
    const result = darken(0xff0000);
    expect(toHex(result)).toBe(toHex(0xf20000));
  });

  it('darkens white', () => {
    // (255, 255, 255) * 0.95 → (242, 242, 242)
    const result = darken(0xffffff);
    expect(toHex(result)).toBe(toHex(0xf2f2f2));
  });

  it('keeps black as black', () => {
    expect(darken(0x000000)).toBe(0x000000);
  });

  it('returns a number smaller than input for non-black colors', () => {
    expect(darken(MAIN_BLUE_3)).toBeLessThan(MAIN_BLUE_3);
  });
});

describe('lightenHsl', () => {
  it('converts hsl string to hsla with 40% alpha', () => {
    expect(lightenHsl('hsl(200, 50%, 50%)')).toBe('hsla(200, 50%, 50%,40%)');
  });

  it('returns empty string for non-hsl input', () => {
    expect(lightenHsl('#ff0000')).toBe('');
    expect(lightenHsl('rgb(255, 0, 0)')).toBe('');
    expect(lightenHsl('')).toBe('');
  });
});

describe('getTranslucentColor', () => {
  it('converts hsl color to hsla with given opacity', () => {
    expect(getTranslucentColor('hsl(207,90%,54%)', 0.2)).toBe('hsla(207,90%,54%, 0.2)');
  });

  it('converts 6-digit hex color to rgba with given opacity', () => {
    expect(getTranslucentColor('#3b82f6', 0.25)).toBe('rgba(59, 130, 246, 0.25)');
  });

  it('converts 3-digit hex color to rgba with given opacity', () => {
    expect(getTranslucentColor('#f00', 0.5)).toBe('rgba(255, 0, 0, 0.5)');
  });

  it('converts rgb color to rgba with given opacity', () => {
    expect(getTranslucentColor('rgb(10, 20, 30)', 0.3)).toBe('rgba(10, 20, 30, 0.3)');
  });

  it('falls back to color-mix for named colors', () => {
    expect(getTranslucentColor('blue', 0.2)).toBe('color-mix(in srgb, blue 20%, transparent)');
  });

  it('returns transparent for empty or null color', () => {
    expect(getTranslucentColor('')).toBe('transparent');
    expect(getTranslucentColor(null)).toBe('transparent');
  });
});

describe('getContrastTextColor', () => {
  it('returns black for light HSL colors', () => {
    expect(getContrastTextColor('hsl(54,100%,62%)')).toBe('#ffffff');
    expect(getContrastTextColor('hsl(60,100%,80%)')).toBe('#000000');
  });

  it('returns white for dark HSL colors', () => {
    expect(getContrastTextColor('hsl(262,52%,47%)')).toBe('#ffffff');
    expect(getContrastTextColor('hsl(4,90%,58%)')).toBe('#ffffff');
  });

  it('returns black for light hex colors', () => {
    expect(getContrastTextColor('#ffffff')).toBe('#000000');
    expect(getContrastTextColor('#ffff00')).toBe('#000000');
  });

  it('returns white for dark hex colors', () => {
    expect(getContrastTextColor('#000000')).toBe('#ffffff');
    expect(getContrastTextColor('#1e3a8a')).toBe('#ffffff');
  });

  it('returns white for empty or missing color', () => {
    expect(getContrastTextColor('')).toBe('#ffffff');
    expect(getContrastTextColor(null)).toBe('#ffffff');
  });
});
