// `npm run dev` cũng lưu bảng xếp hạng ra đĩa (save/leaderboard.json) qua cùng API với server.mjs.
import { defineConfig } from 'vite';
import { handleApi } from './server.mjs';

export default defineConfig({
  base: './', // dist/ chạy được ở mọi thư mục con (gói release, GitHub Pages…)
  plugins: [{
    name: 'ddl-leaderboard-api',
    configureServer(server) {
      server.middlewares.use((req, res, next) => { handleApi(req, res).then((done) => { if (!done) next(); }, next); });
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => { handleApi(req, res).then((done) => { if (!done) next(); }, next); });
    },
  }],
});
