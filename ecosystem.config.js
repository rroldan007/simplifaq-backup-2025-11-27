module.exports = {
  apps: [
    {
      name: 'simplifaq-my-backend',
      cwd: '/var/www/simplifaq/my/backend',
      script: 'node_modules/.bin/ts-node',
      args: 'src/index.ts',
      env: {
        NODE_ENV: 'production',
        PORT: 3031,
        // Asistente ADM Configuration
        ASISTENTE_BASE_URL: 'https://ia.simplifaq.cloud',
        ASISTENTE_API_KEY: 'b262af66687adf2b6ee10c80519874f2c9ad055507a53aefdd75238785a5bb4a',
        ASISTENTE_TIMEOUT_MS: '30000'
      },
      env_file: '/var/www/simplifaq/my/backend/.env.production',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      error_file: '/var/www/simplifaq/my/logs/backend-error.log',
      out_file: '/var/www/simplifaq/my/logs/backend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true
    }
  ]
};
