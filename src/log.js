// LOG_LEVEL: release, debug
// release: 只输出关键信息
// debug: 输出关键信息和调试信息

const LOG_LEVEL = 'release';

function log(...args) {
  switch (LOG_LEVEL) {
    case 'debug':
      console.log(...args);
      break;
    case 'release':
      break;
  }
}

export default log;
