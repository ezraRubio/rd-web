import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    resolve: {
        alias: {
            'libsodium-wrappers': resolve(__dirname, 'node_modules/libsodium-wrappers-sumo/dist/modules-sumo/libsodium-wrappers.js'),
            'libsodium-wrappers-sumo': resolve(__dirname, 'node_modules/libsodium-wrappers-sumo/dist/modules-sumo/libsodium-wrappers.js'),
        },
    },
    optimizeDeps: {
        include: ['libsodium-wrappers-sumo', 'protobufjs/minimal', 'long'],
    },
    build: {
        manifest: 'manifest.json',
        outDir: '../web/js/dist',
        commonjsOptions: {
            include: [/libsodium/, /protobufjs/, /node_modules/],
        },
        rollupOptions: {
            input: resolve(__dirname, 'src/main.ts'),
            output: {
                entryFileNames: `index-[hash].js`,
                chunkFileNames: `[name]-[hash].js`,
                assetFileNames: `[name]-[hash].[ext]`,
            }
        }
    },
})
