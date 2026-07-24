import { defineConfig } from 'vite';

export default defineCongig({
    server: {
        proxy: {
            '/api': {
                target: 'http:localhost:5001',
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/api/, '')
            },
        },
    },    
})