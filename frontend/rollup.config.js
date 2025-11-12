import { nodeResolve } from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';

const production = process.env.BUILD === 'production';

export default {
  input: 'main.js',
  output: [
    {
      file: '../django_liveview/static/django_liveview/liveview.js',
      format: 'iife',
      name: 'DjangoLiveView',
      sourcemap: !production
    },
    production && {
      file: '../django_liveview/static/django_liveview/liveview.min.js',
      format: 'iife',
      name: 'DjangoLiveView',
      plugins: [terser()]
    }
  ].filter(Boolean),
  plugins: [
    nodeResolve()
  ]
};
