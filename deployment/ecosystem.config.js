module.exports = {
  apps: [
    {
      name: 'supermarket-backend',
      script: 'server.js',
      cwd: '/var/www/supermarket/backend',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 5000
      },
      watch: false,
      max_memory_restart: '500M',
      exp_backoff_restart_delay: 100
    }
  ]
};
