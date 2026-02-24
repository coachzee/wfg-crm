module.exports = {
  apps: [{
    name: 'wfgcrm',
    script: './startup.sh',
    interpreter: 'bash',
    cwd: '/var/www/wfgcrm',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
};
