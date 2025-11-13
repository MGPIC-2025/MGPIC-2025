import { messageQueue, registerAllHandlers } from './messageQueue.js';

import {
  global_gacha,
  global_get_resource,
  global_craft,
  global_get_copper_list,
  global_upgrade_copper,
  global_info_subscribe,
  global_import_save,
  global_export_save,
  eventloop as eventloop_main,
} from './main.js';

// 立即注册消息处理器
registerAllHandlers();

function gacha() {
  return JSON.parse(global_gacha());
}

function get_resource() {
  return JSON.parse(global_get_resource());
}

function craft() {
  return JSON.parse(global_craft());
}

function get_copper_list() {
  return JSON.parse(global_get_copper_list());
}

function upgrade_copper(id) {
  return JSON.parse(global_upgrade_copper(id));
}

function info_subscribe(callback) {
  global_info_subscribe(info => {
    const message = JSON.parse(info);
    callback(message);
    messageQueue.enqueue(message);
  });
}

function import_save(save) {
  global_import_save(save);
}

function export_save() {
  return JSON.parse(global_export_save());
}

function eventloop(msg) {
  eventloop_main(msg);
}

export {
  gacha,
  craft,
  get_resource,
  get_copper_list,
  upgrade_copper,
  info_subscribe,
  import_save,
  export_save,
  eventloop,
  messageQueue,
};
