/**
 * Пресеты уникализации (порт из Python presets.py)
 */

/** Ключи всех методов */
const METHOD_KEYS = [
  'crop', 'rotate', 'hflip', 'speed', 'color', 'noise',
  'vignette', 'blur', 'resample', 'encode', 'trim',
  'audio', 'watermark', 'fade', 'remux',
];

/** Умеренный пресет — toggle OFF */
function moderatePreset() {
  return {
    enabledMethods: {
      crop: true,
      rotate: false,
      hflip: false,
      speed: true,
      color: true,
      noise: false,
      vignette: false,
      blur: false,
      resample: false,
      encode: true,
      trim: false,
      audio: true,
      watermark: false,
      fade: true,
      remux: true,
    },
    cropMaxPct: 1.5,
    speedMin: 0.98,
    speedMax: 1.02,
    crfMin: 20,
    crfMax: 24,
    blurSigmaMin: 0.5,
    blurSigmaMax: 1.0,
    resampleMin: 0.97,
    resampleMax: 0.99,
  };
}

/** Максимальный пресет — toggle ON, все методы */
function maximumPreset() {
  const enabled = {};
  METHOD_KEYS.forEach((k) => { enabled[k] = true; });
  return {
    enabledMethods: enabled,
    cropMaxPct: 3.0,
    speedMin: 0.95,
    speedMax: 1.05,
    crfMin: 18,
    crfMax: 24,
    blurSigmaMin: 0.5,
    blurSigmaMax: 1.5,
    resampleMin: 0.95,
    resampleMax: 0.98,
  };
}

/** Выбор пресета по флагу maxMode */
function getPreset(maxMode) {
  return maxMode ? maximumPreset() : moderatePreset();
}

module.exports = { METHOD_KEYS, moderatePreset, maximumPreset, getPreset };
