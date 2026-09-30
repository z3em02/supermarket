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
        PORT: 5000,
        // Only nginx (same host) should reach the API — see server.js.
        HOST: '127.0.0.1'
      },
      watch: false,
      max_memory_restart: '500M',
      exp_backoff_restart_delay: 100,
      // server.js lets open requests finish for up to 8 s on shutdown; wait
      // longer than that before PM2 force-kills a worker on reload/stop.
      kill_timeout: 10000,
      // A timestamp on every log line, and one log file for all workers.
      // Rotation: pm2-logrotate (README §4.8).
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true
    }
  ]
};
