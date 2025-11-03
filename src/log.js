// LOG_LEVEL: release, debug
// release: 只输出关键信息
// debug: 输出关键信息和调试信息

const LOG_LEVEL = 'debug';

function log(message) {
  switch (LOG_LEVEL) {
    case 'debug':
      console.log(message);
      break;
    case 'release':
      break;
  }
}

export default log;
