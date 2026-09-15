import _ from 'lodash';

export const MAIN_BLUE_3 = 0xdcefff;
export const GREENISH = 0x1fff3d;
export const PINKISH = 0xf0dbff;

export const THEME_COLORS = [MAIN_BLUE_3, GREENISH];

export const toHex = (number) => `#${(2 ** 24 + number).toString(16).substring(1)}`;

const num = ({r, g, b}) => b + 256 * (g + 256 * r);

const rgb = (value) => ({
  r: Math.floor(value / 256 / 256),
  g: Math.floor(value / 256) % 256,
  b: value % 256,
});

export const darken = (number) => {
  const rgbColor = rgb(number);
  const p = 0.95;
  const r = Math.floor(rgbColor.r * p);
  const g = Math.floor(rgbColor.g * p);
  const b = Math.floor(rgbColor.b * p);
  return num({r, g, b});
};

export const lightenHsl = (string) => {
  if (!_.startsWith(string, 'hsl(')) {
    return '';
  }
  return `hsla${string.substring(3, string.length - 1)},40%)`;
};

export const getTranslucentColor = (color, opacity = 0.2) => {
  if (!color) return 'transparent';
  if (color.startsWith('hsl(')) {
    return `hsla(${color.slice(4, -1)}, ${opacity})`;
  }
  if (color.startsWith('hsla(')) {
    const parts = color.slice(5, -1).split(',');
    return `hsla(${parts[0]}, ${parts[1]}, ${parts[2]}, ${opacity})`;
  }
  if (color.startsWith('#')) {
    let hex = color.slice(1);
    if (hex.length === 3) {
      hex = hex
        .split('')
        .map((c) => c + c)
        .join('');
    }
    if (hex.length === 6) {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    }
  }
  if (color.startsWith('rgb(')) {
    return `rgba(${color.slice(4, -1)}, ${opacity})`;
  }
  if (color.startsWith('rgba(')) {
    const parts = color.slice(5, -1).split(',');
    return `rgba(${parts[0]}, ${parts[1]}, ${parts[2]}, ${opacity})`;
  }
  return `color-mix(in srgb, ${color} ${Math.round(opacity * 100)}%, transparent)`;
};

export const getContrastTextColor = (color) => {
  if (!color) return '#ffffff';
  const hslMatch = color.match(/hsla?\(\s*\d+\s*,\s*[\d.]+%\s*,\s*([\d.]+)%/);
  if (hslMatch) {
    const lightness = parseFloat(hslMatch[1]);
    return lightness > 65 ? '#000000' : '#ffffff';
  }
  if (color.startsWith('#')) {
    let hex = color.slice(1);
    if (hex.length === 3) {
      hex = hex
        .split('')
        .map((c) => c + c)
        .join('');
    }
    if (hex.length === 6) {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      const yiq = (r * 299 + g * 587 + b * 114) / 1000;
      return yiq >= 150 ? '#000000' : '#ffffff';
    }
  }
  return '#ffffff';
};
