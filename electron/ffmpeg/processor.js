/**
 * Процессор: параллельная очередь копий, пакетная обработка, spawn ffmpeg.
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { ffmpegPath } = require('./pathResolver');
const { getMediaInfo } = require('./probe');
const { parseProgressLine } = require('./progressParser');
const { getPreset } = require('./presets');
const { buildFilterPlan, buildFfmpegArgs, stripWatermark } = require('./filterBuilder');
const { getOutputDirName, getOutputExt } = require('./mediaUtils');

class ProcessingManager {
  constructor() {
    this.running = false;
    this.cancelled = false;
    this.activeJobs = new Map();
    this.queue = [];
    this.jobProgress = {};
    this.totalJobs = 0;
    this.completedJobs = 0;
    this.successCount = 0;
    this.totalVideos = 1;
    this.outputDirs = [];
    this.callbacks = {};
    this.maxParallel = 1;
  }

  on(event, cb) {
    this.callbacks[event] = cb;
  }

  emit(event, ...args) {
    if (this.callbacks[event]) this.callbacks[event](...args);
  }

  _outputName(inputPath, copyIndex, batchMode) {
    return getOutputExt(inputPath, copyIndex, batchMode);
  }

  /** Запуск обработки (одно или несколько видео) */
  async start({ inputPaths, inputPath, numCopies, maxMode, batchMode = false }) {
    if (this.running) return { ok: false, error: 'Уже выполняется' };

    const paths = inputPaths?.length
      ? inputPaths
      : inputPath
        ? [inputPath]
        : [];

    if (!paths.length) return { ok: false, error: 'Нет файлов для обработки' };

    this.running = true;
    this.cancelled = false;
    this.completedJobs = 0;
    this.successCount = 0;
    this.jobProgress = {};
    this.activeJobs.clear();
    this.queue = [];
    this.preset = getPreset(maxMode);
    this.batchMode = batchMode || paths.length > 1;
    this.numCopies = numCopies;

    const metas = new Map();
    for (const p of paths) {
      try {
        const meta = await getMediaInfo(p);
        metas.set(p, meta);
        const info = meta.isImage
          ? `${meta.mediaLabel}: ${meta.resolution}`
          : `${meta.resolution}, ${meta.durationFormatted}`;
        this.emit('log', `✓ ${meta.name} (${info})`, 'info');
      } catch (e) {
        this.emit('log', `✗ ${path.basename(p)}: ${e.message}`, 'error');
      }
    }

    const validPaths = paths.filter((p) => metas.has(p));
    if (!validPaths.length) {
      this.running = false;
      this.emit('stopped');
      return { ok: false, error: 'Не удалось прочитать ни одного файла' };
    }

    this.totalVideos = validPaths.length;
    this.outputDirs = [];

    for (let vi = 0; vi < validPaths.length; vi++) {
      const input = validPaths[vi];
      const outputDir = path.join(path.dirname(path.resolve(input)), getOutputDirName(input));
      fs.mkdirSync(outputDir, { recursive: true });
      if (!this.outputDirs.includes(outputDir)) this.outputDirs.push(outputDir);

      for (let ci = 1; ci <= numCopies; ci++) {
        const jobId = `${vi + 1}-${ci}`;
        this.queue.push({
          jobId,
          videoIndex: vi + 1,
          copyIndex: ci,
          inputPath: input,
          outputPath: path.join(outputDir, this._outputName(input, ci, this.batchMode)),
          meta: metas.get(input),
        });
        this.jobProgress[jobId] = 0;
      }
    }

    this.totalJobs = this.queue.length;
    this.maxParallel = Math.min(this.totalJobs, os.cpus().length || 4);

    if (this.totalVideos > 1) {
      this.emit('log', `Пакет: ${this.totalVideos} файлов × ${numCopies} копий = ${this.totalJobs} задач`, 'info');
    } else {
      this.emit('log', `Старт: ${numCopies} копий, потоков: ${this.maxParallel}`, 'info');
    }
    this.emit('log', `Папки вывода: ${this.outputDirs.join('; ')}`, 'info');
    this.emit('started');

    this._spawnWorkers();
    return { ok: true, outputDirs: this.outputDirs };
  }

  _spawnWorkers() {
    while (this.activeJobs.size < this.maxParallel && this.queue.length > 0 && !this.cancelled) {
      const job = this.queue.shift();
      this._processJob(job);
    }
  }

  _jobLabel(job) {
    const type = job.meta?.isImage ? 'Фото' : 'Видео';
    if (this.totalVideos > 1) {
      return `${type} ${job.videoIndex}/${this.totalVideos}, копия ${job.copyIndex}`;
    }
    return `Копия ${job.copyIndex}`;
  }

  async _processJob(job) {
    const { jobId, inputPath, outputPath, meta } = job;
    const label = this._jobLabel(job);
    this.emit('log', `${label}: старт (${meta.name})…`, 'progress');

    const plan = buildFilterPlan(this.preset, meta);
    this.emit('log', `${label}: методы [${plan.appliedMethods.join(', ')}]`, 'info');

    let args = buildFfmpegArgs(inputPath, outputPath, plan, meta);

    try {
      await this._runFfmpeg(job, args, meta);

      if (this.preset.enabledMethods.remux && !meta.isImage && !this.cancelled) {
        await this._remux(outputPath);
      }

      if (this.cancelled) {
        this._cleanup(outputPath);
        this.emit('log', `${label}: отменена`, 'error');
      } else {
        this.successCount++;
        this.jobProgress[jobId] = 100;
        this._emitTotalProgress();
        this.emit('log', `${label}: готово → ${path.basename(outputPath)}`, 'success');
        this.emit('copyDone', {
          videoIndex: job.videoIndex,
          copyIndex: job.copyIndex,
          outputPath,
          label,
        });
      }
    } catch (err) {
      if (plan.hasWatermark && !this.cancelled) {
        this.emit('log', `${label}: повтор без watermark…`, 'progress');
        const safePlan = stripWatermark(plan);
        args = buildFfmpegArgs(inputPath, outputPath, safePlan, meta);
        try {
          await this._runFfmpeg(job, args, meta);
          if (this.preset.enabledMethods.remux && !meta.isImage && !this.cancelled) {
            await this._remux(outputPath);
          }
          this.successCount++;
          this.jobProgress[jobId] = 100;
          this._emitTotalProgress();
          this.emit('log', `${label}: готово (без watermark)`, 'success');
          this.emit('copyDone', {
            videoIndex: job.videoIndex,
            copyIndex: job.copyIndex,
            outputPath,
            label,
          });
        } catch (e2) {
          this._cleanup(outputPath);
          this.emit('log', `${label}: ошибка — ${e2.message}`, 'error');
          this.emit('error', e2.message);
        }
      } else if (!this.cancelled) {
        this._cleanup(outputPath);
        this.emit('log', `${label}: ошибка — ${err.message}`, 'error');
        this.emit('error', err.message);
      }
    }

    this.activeJobs.delete(jobId);
    this.completedJobs++;
    this._emitTotalProgress();

    if (this.queue.length > 0 && !this.cancelled) {
      this._spawnWorkers();
    }

    if (this.completedJobs >= this.totalJobs) {
      this._finish();
    }
  }

  _emitJobProgress(job, percent) {
    const { jobId, videoIndex, copyIndex } = job;
    const label = this._jobLabel(job);
    this.jobProgress[jobId] = percent;
    this.emit('copyProgress', {
      videoIndex,
      totalVideos: this.totalVideos,
      copyIndex,
      percent,
      label,
    });
    this._emitTotalProgress();
  }

  _runFfmpeg(job, args, meta) {
    const { jobId } = job;
    const isImage = meta.isImage;
    const durationSec = meta.duration || 1;

    return new Promise((resolve, reject) => {
      if (this.cancelled) {
        reject(new Error('Отменено'));
        return;
      }

      if (isImage) this._emitJobProgress(job, 20);

      const proc = spawn(ffmpegPath(), args, { windowsHide: true });
      this.activeJobs.set(jobId, proc);
      let stderrTail = '';

      proc.stderr.on('data', (data) => {
        const chunk = data.toString();
        stderrTail = (stderrTail + chunk).slice(-4000);
        if (isImage) return;
        for (const line of chunk.split('\n')) {
          const pct = parseProgressLine(line, durationSec);
          if (pct !== null) this._emitJobProgress(job, pct);
        }
      });

      proc.on('close', (code) => {
        this.activeJobs.delete(jobId);
        if (this.cancelled) {
          reject(new Error('Отменено'));
        } else if (code === 0) {
          if (isImage) this._emitJobProgress(job, 100);
          resolve();
        } else {
          const errLine = stderrTail
            .split('\n')
            .map((l) => l.trim())
            .filter((l) => l && (/error|invalid|failed|not found/i.test(l)))
            .pop();
          reject(new Error(errLine || `FFmpeg завершился с кодом ${code}`));
        }
      });

      proc.on('error', (err) => {
        this.activeJobs.delete(jobId);
        if (err.code === 'ENOENT') {
          reject(new Error('ffmpeg не найден. Windows: resources/bin/win/ · Mac: resources/bin/mac/'));
        } else {
          reject(err);
        }
      });
    });
  }

  _remux(filePath) {
    return new Promise((resolve) => {
      const tmpPath = filePath + '.remux.tmp.mp4';
      const args = [
        '-y', '-hide_banner', '-loglevel', 'error',
        '-i', filePath,
        '-c', 'copy',
        '-movflags', '+faststart',
        tmpPath,
      ];
      const proc = spawn(ffmpegPath(), args, { windowsHide: true });
      proc.on('close', (code) => {
        if (code === 0) {
          try { fs.renameSync(tmpPath, filePath); } catch { /* ignore */ }
        } else {
          try { fs.unlinkSync(tmpPath); } catch { /* ignore */ }
        }
        resolve();
      });
      proc.on('error', () => resolve());
    });
  }

  _emitTotalProgress() {
    if (this.totalJobs <= 0) return;
    const total = Object.values(this.jobProgress).reduce((a, b) => a + b, 0) / this.totalJobs;
    this.emit('totalProgress', Math.round(total));
  }

  _cleanup(filePath) {
    try { fs.unlinkSync(filePath); } catch { /* ignore */ }
  }

  _finish() {
    this.running = false;
    if (this.cancelled) {
      this.emit('log', 'Обработка остановлена пользователем', 'error');
    } else if (this.successCount > 0) {
      const msg = this.totalVideos > 1
        ? `Готово: ${this.successCount} из ${this.totalJobs} задач (${this.totalVideos} файлов)`
        : `Готово: ${this.successCount} из ${this.totalJobs} копий`;
      this.emit('log', msg, 'success');
      this.emit('allDone', {
        outputDirs: this.outputDirs,
        outputDir: this.outputDirs[0],
        totalVideos: this.totalVideos,
        successCount: this.successCount,
      });
    } else {
      this.emit('log', 'Не удалось создать ни одной копии', 'error');
    }
    this.emit('stopped');
  }

  cancel() {
    this.cancelled = true;
    this.emit('log', 'Отмена… дождитесь завершения активных потоков', 'error');
    for (const [, proc] of this.activeJobs) {
      try { proc.kill('SIGTERM'); } catch { /* ignore */ }
    }
  }
}

module.exports = { ProcessingManager };
