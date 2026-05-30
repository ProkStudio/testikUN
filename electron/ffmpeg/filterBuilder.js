/**
 * Построение filter_complex с 15 методами уникализации.
 * Случайные параметры + shuffle порядка фильтров.
 */

/** Случайное число в диапазоне [min, max] */
function rand(min, max) {
  return min + Math.random() * (max - min);
}

/** Случайное целое [min, max] */
function randInt(min, max) {
  return Math.floor(rand(min, max + 1));
}

/** Чётное число (libx264 требует чётные width/height для yuv420p) */
function even(n) {
  return Math.max(2, Math.floor(n / 2) * 2);
}

/** Fisher-Yates shuffle */
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Экранирование текста для drawtext */
function escDrawtext(s) {
  return s.replace(/\\/g, '\\\\').replace(/:/g, '\\:').replace(/'/g, "\\'");
}

/** Цепочка atempo для значений вне 0.5–2.0 */
function buildAtempoChain(speed) {
  const filters = [];
  let remaining = speed;
  while (remaining > 2.0) {
    filters.push('atempo=2.0');
    remaining /= 2.0;
  }
  while (remaining < 0.5) {
    filters.push('atempo=0.5');
    remaining /= 0.5;
  }
  if (Math.abs(remaining - 1.0) > 0.001) {
    filters.push(`atempo=${remaining.toFixed(4)}`);
  }
  return filters;
}

/** Генераторы видео-фильтров */
const videoFilters = {
  crop(settings, meta) {
    const maxPct = settings.cropMaxPct / 100;
    const left = Math.floor(meta.width * rand(0, maxPct));
    const right = Math.floor(meta.width * rand(0, maxPct));
    const top = Math.floor(meta.height * rand(0, maxPct));
    const bottom = Math.floor(meta.height * rand(0, maxPct));
    const w = even(meta.width - left - right);
    const h = even(meta.height - top - bottom);
    return `crop=${w}:${h}:${left}:${top}`;
  },

  rotate(settings, meta) {
    const angleRad = (rand(-2, 2) * Math.PI) / 180;
    const w = even(meta.width);
    const h = even(meta.height);
    return [
      `rotate=${angleRad.toFixed(6)}:fillcolor=black@0`,
      `crop=${w}:${h}:(iw-${w})/2:(ih-${h})/2`,
    ];
  },

  hflip() {
    return Math.random() < 0.5 ? 'hflip' : null;
  },

  speed(settings) {
    const factor = rand(settings.speedMin, settings.speedMax);
    metaSpeed = factor; // сохраняем для аудио
    return `setpts=PTS/${factor.toFixed(4)}`;
  },

  color() {
    const rs = rand(-0.08, 0.08).toFixed(3);
    const gs = rand(-0.08, 0.08).toFixed(3);
    const bs = rand(-0.08, 0.08).toFixed(3);
    const br = rand(-0.06, 0.06).toFixed(3);
    const co = rand(0.92, 1.1).toFixed(3);
    const sa = rand(0.92, 1.08).toFixed(3);
    const hue = rand(-5, 5).toFixed(1);
    // hue — отдельный фильтр (eq не поддерживает hue)
    return [
      `colorbalance=rs=${rs}:gs=${gs}:bs=${bs}`,
      `eq=brightness=${br}:contrast=${co}:saturation=${sa}`,
      `hue=h=${hue}`,
    ];
  },

  noise() {
    const amp = randInt(5, 15);
    return `noise=alls=${amp}:allf=t+u`;
  },

  vignette() {
    return 'vignette=angle=PI/4';
  },

  blur(settings) {
    const sigma = rand(settings.blurSigmaMin, settings.blurSigmaMax);
    if (Math.random() < 0.5) {
      const amount = sigma.toFixed(2);
      return `unsharp=luma_amount=${amount}:chroma_amount=${amount}`;
    }
    return `smartblur=lr=${sigma.toFixed(2)}:ls=-0.5`;
  },

  resample(settings, meta) {
    const scale = rand(settings.resampleMin, settings.resampleMax);
    const sw = even(Math.floor(meta.width * scale));
    const sh = even(Math.floor(meta.height * scale));
    const dw = even(meta.width);
    const dh = even(meta.height);
    return [
      `scale=${sw}:${sh}`,
      `scale=${dw}:${dh}:flags=bilinear`,
    ];
  },

  trim(settings, meta) {
    const frames = randInt(1, 3);
    const startSec = frames / (meta.fps || 24);
    return [
      `trim=start=${startSec.toFixed(6)}`,
      'setpts=PTS-STARTPTS',
    ];
  },

  watermark() {
    const now = new Date();
    const text = escDrawtext(
      `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`
    );
    const corners = [
      ['10', '10'],
      ['w-tw-10', '10'],
      ['10', 'h-th-10'],
      ['w-tw-10', 'h-th-10'],
    ];
    const [x, y] = corners[randInt(0, corners.length - 1)];
    return `drawtext=text='${text}':x=${x}:y=${y}:fontsize=18:fontcolor=cyan@0.35:borderw=0`;
  },

  fade(settings, meta) {
    const fd = rand(0.2, 0.5);
    const stOut = Math.max(0, meta.duration - fd);
    return [
      `fade=t=in:st=0:d=${fd.toFixed(3)}`,
      `fade=t=out:st=${stOut.toFixed(3)}:d=${fd.toFixed(3)}`,
    ];
  },
};

/** Генераторы аудио-фильтров */
const audioFilters = {
  speed(settings) {
    const factor = metaSpeed || rand(settings.speedMin, settings.speedMax);
    return buildAtempoChain(factor);
  },

  audio(settings) {
    const vol = rand(0.89, 1.12).toFixed(3);
    const delayMs = Math.round(rand(-100, 100));
    const parts = [`volume=${vol}`];
    if (delayMs > 0) {
      parts.push(`adelay=${delayMs}|${delayMs}`);
    } else if (delayMs < 0) {
      parts.push(`atrim=start=${(-delayMs / 1000).toFixed(3)}`);
      parts.push('asetpts=PTS-STARTPTS');
    }
    return parts;
  },
};

// Глобальная переменная для синхронизации speed видео/аудио
let metaSpeed = 1.0;

/** Методы, неприменимые к фото */
const IMAGE_SKIP = new Set(['speed', 'trim', 'fade', 'audio', 'remux']);

/** Собирает filter_complex и параметры кодирования */
function buildFilterPlan(settings, meta) {
  metaSpeed = 1.0;
  const isImage = !!meta.isImage;

  const videoParts = [];
  const audioParts = [];
  const appliedMethods = [];

  const methodOrder = shuffle([
    'crop', 'rotate', 'hflip', 'speed', 'color', 'noise',
    'vignette', 'blur', 'resample', 'trim', 'watermark', 'fade',
  ]);

  for (const method of methodOrder) {
    if (!settings.enabledMethods[method]) continue;
    if (isImage && IMAGE_SKIP.has(method)) continue;

    if (videoFilters[method]) {
      const result = videoFilters[method](settings, meta);
      if (result === null) continue;
      const parts = Array.isArray(result) ? result : [result];
      videoParts.push(...parts);
      appliedMethods.push(method);
    }
  }

  // Аудио-фильтры
  if (meta.hasAudio) {
    if (settings.enabledMethods.speed && videoParts.some((p) => p.startsWith('setpts'))) {
      const af = audioFilters.speed(settings);
      audioParts.push(...af);
      if (!appliedMethods.includes('speed')) appliedMethods.push('speed');
    }
    if (settings.enabledMethods.audio) {
      const af = audioFilters.audio(settings);
      audioParts.push(...af);
      appliedMethods.push('audio');
    }
  }

  const encodeOpts = { isImage };
  if (isImage) {
    if (settings.enabledMethods.encode) {
      encodeOpts.jpegQuality = randInt(2, 8);
      encodeOpts.pngLevel = randInt(1, 9);
      appliedMethods.push('encode');
    } else {
      encodeOpts.jpegQuality = 4;
      encodeOpts.pngLevel = 6;
    }
  } else if (settings.enabledMethods.encode) {
    encodeOpts.crf = randInt(settings.crfMin, settings.crfMax);
    encodeOpts.gop = randInt(24, 120);
    appliedMethods.push('encode');
  } else {
    encodeOpts.crf = 23;
    encodeOpts.gop = 48;
  }

  // Сборка filter_complex
  let filterComplex = '';
  if (videoParts.length > 0) {
    // Гарантируем чётные размеры перед кодированием
    videoParts.push('scale=trunc(iw/2)*2:trunc(ih/2)*2');
    filterComplex += `[0:v]${videoParts.join(',')}[vout]`;
  }
  if (audioParts.length > 0 && meta.hasAudio) {
    if (filterComplex) filterComplex += ';';
    filterComplex += `[0:a]${audioParts.join(',')}[aout]`;
  }

  // Для фото — цепочка фильтров без filter_complex (используется -vf)
  const vfChain = videoParts.length > 0 ? videoParts.join(',') : '';

  return {
    filterComplex,
    vfChain,
    encodeOpts,
    appliedMethods,
    hasWatermark: appliedMethods.includes('watermark'),
  };
}

/** Строит аргументы ffmpeg для одной копии (видео или фото) */
function buildFfmpegArgs(inputPath, outputPath, plan, meta) {
  const args = [
    '-y', '-hide_banner', '-loglevel', 'info',
    '-i', inputPath,
  ];

  // Фото: -vf + -update 1 (один кадр в файл)
  if (meta.isImage) {
    if (plan.vfChain) {
      args.push('-vf', plan.vfChain);
    }
    args.push('-frames:v', '1', '-update', '1');
    if (outputPath.toLowerCase().endsWith('.png')) {
      args.push(
        '-c:v', 'png',
        '-compression_level', String(plan.encodeOpts.pngLevel || 6),
      );
    } else {
      args.push('-q:v', String(plan.encodeOpts.jpegQuality || 4));
    }
    args.push(outputPath);
    return args;
  }

  if (plan.filterComplex) {
    args.push('-filter_complex', plan.filterComplex);
    if (plan.filterComplex.includes('[vout]')) {
      args.push('-map', '[vout]');
    } else {
      args.push('-map', '0:v');
    }
    if (plan.filterComplex.includes('[aout]')) {
      args.push('-map', '[aout]');
    } else if (meta.hasAudio) {
      args.push('-map', '0:a');
    }
  } else {
    args.push('-map', '0:v');
    if (meta.hasAudio) args.push('-map', '0:a');
  }

  args.push(
    '-c:v', 'libx264',
    '-preset', 'medium',
    '-crf', String(plan.encodeOpts.crf),
    '-g', String(plan.encodeOpts.gop),
    '-pix_fmt', 'yuv420p',
  );
  if (meta.hasAudio) {
    args.push('-c:a', 'aac', '-b:a', '128k');
  }
  args.push('-movflags', '+faststart', outputPath);
  return args;
}

/** Fallback: убрать drawtext из filter_complex */
function stripWatermark(plan) {
  if (!plan.filterComplex?.includes('drawtext') && !plan.vfChain?.includes('drawtext')) {
    return plan;
  }
  const newPlan = { ...plan };
  if (newPlan.filterComplex) {
    newPlan.filterComplex = plan.filterComplex.replace(/,?drawtext=[^,\]]+/g, '');
  }
  if (newPlan.vfChain) {
    newPlan.vfChain = plan.vfChain.replace(/,?drawtext=[^,]+/g, '');
  }
  newPlan.hasWatermark = false;
  return newPlan;
}

module.exports = {
  buildFilterPlan,
  buildFfmpegArgs,
  stripWatermark,
  shuffle,
};
