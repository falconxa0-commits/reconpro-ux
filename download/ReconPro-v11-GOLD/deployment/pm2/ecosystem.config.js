module.exports = {
  apps: [{
    name: 'reconpro', script: 'npm', args: 'start',
    cwd: '/opt/reconpro/web', instances: 1, exec_mode: 'fork',
    env: { NODE_ENV: 'production', PORT: 3000, DATABASE_URL: 'file:/opt/reconpro/web/db/reconpro.db' },
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    error_file: '/var/log/reconpro/pm2-error.log', out_file: '/var/log/reconpro/pm2-out.log',
    max_memory_restart: '512M', autorestart: true, watch: false
  }]
};
