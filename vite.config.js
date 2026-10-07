import { defineConfig } from 'vite';
import fs from 'node:fs';

const readJson = (file) => {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return {};
  }
};
const escapeHtml = (value) =>
  String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const lookup = (obj, dotted) => dotted.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);

/**
 * Replaces {{dotted.path}} in index.html with values from event.config.json
 * and src/generated/images.json (namespace `img.`). Tags carrying
 * data-if="path" are dropped when that value is empty.
 */
function htmlTokens() {
  return {
    name: 'html-tokens',
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        const data = { ...readJson('event.config.json'), img: readJson('src/generated/images.json') };
        const empty = new Set();
        const kept = html.replace(/<[^>]*\sdata-if="([\w.]+)"[^>]*>/g, (tag, key) =>
          lookup(data, key) ? tag.replace(/\sdata-if="[\w.]+"/, '') : ''
        );
        const out = kept.replace(/\{\{([\w.]+)\}\}/g, (_, key) => {
          const value = lookup(data, key);
          if (value == null || value === '') {
            empty.add(key);
            return '';
          }
          return escapeHtml(value);
        });
        if (empty.size) console.warn(`[html-tokens] empty values: ${[...empty].join(', ')}`);
        return out;
      },
    },
  };
}

/** Inlines built CSS into index.html so no stylesheet blocks first paint. */
function inlineCss() {
  return {
    name: 'inline-css',
    apply: 'build',
    enforce: 'post',
    generateBundle(_, bundle) {
      const page = bundle['index.html'];
      if (!page) return;
      page.source = page.source.replace(/<link rel="stylesheet"[^>]*href="\/?([^"]+\.css)"[^>]*>/g, (match, href) => {
        const css = bundle[href];
        if (!css) return match;
        delete bundle[href];
        return `<style>${css.source}</style>`;
      });
    },
  };
}

export default defineConfig({
  plugins: [htmlTokens(), inlineCss()],
  build: { target: 'es2020', cssCodeSplit: false, assetsInlineLimit: 0 },
  server: { host: true },
});
