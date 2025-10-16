import {
  global_gacha as global_gacha_api,
  global_get_resource as global_get_resource_api,
  global_get_copper_list as global_get_copper_list_api,
  global_upgrade_copper as global_upgrade_copper_api,
  global_info_subscribe as global_info_subscribe_api,
} from "./main.js";

function gacha() {
  return JSON.parse(global_gacha_api());
}

function get_resource() {
  return JSON.parse(global_get_resource_api());
}

function get_copper_list() {
  return JSON.parse(global_get_copper_list_api());
}

function upgrade_copper(id) {
  return JSON.parse(global_upgrade_copper_api(id));
}

function info_subscribe(callback) {
  global_info_subscribe_api((info) => callback(JSON.parse(info)));
}

export { gacha, get_resource, get_copper_list, upgrade_copper, info_subscribe };
