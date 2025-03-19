import gradient from 'gradient-string';

const createLogger = (prefix = '') => {
  const NODE_ENV = process.env.NODE_ENV || 'development';

  const formatMessage = (level, message, colors, data) => {
    const formattedMessage = `[${prefix}][${level}][${new Date().toISOString()}] ${message}`;
    const gradientString = gradient(colors)(formattedMessage);
    console.log(gradientString, data || '');
  };

  return {
    main: (message) => {
      if (NODE_ENV === 'development') {
        formatMessage('MAIN', message, ['#4A148C', '#E91E63']);
      }
    },
    error: (message, error) =>
      formatMessage('ERROR', message, ['#FF5252', '#B71C1C'], error),
    warn: (message) =>
      formatMessage('WARN', message, ['#FFAB40', '#FF6F00']),
    debug: (message, data) => {
      if (NODE_ENV === 'development') {
        formatMessage('DEBUG', message, ['#29B6F6', '#01579B'], data);
      }
    },
    info: (message, data) =>
      formatMessage('INFO', message, ['#69F0AE', '#00C853'], data)
  };
};

export default createLogger;
