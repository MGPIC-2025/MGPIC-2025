import {
  get_global,
  global_gacha as global_gacha_api,
  global_get_resource as global_get_resource_api,
  global_get_copper_list as global_get_copper_list_api,
  global_upgrade_copper as global_upgrade_copper_api,
  global_info_subscribe as global_info_subscribe_api,
} from "./main.js";

let global = get_global();
let global_info = get_global_info();

function gacha() {
  return JSON.parse(global_gacha_api(global));
}

function get_resource() {
  return JSON.parse(global_get_resource_api(global));
}

function get_copper_list() {
  return JSON.parse(global_get_copper_list_api(global));
}

function upgrade_copper(id) {
  return JSON.parse(global_upgrade_copper_api(global, id));
}

function info_subscribe(callback) {
  global_info_subscribe_api(global_info, callback);
}

export { gacha, get_resource, get_copper_list, upgrade_copper, info_subscribe };
