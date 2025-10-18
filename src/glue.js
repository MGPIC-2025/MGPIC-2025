import {
  global_gacha as global_gacha_api,
  global_get_resource as global_get_resource_api,
  global_get_copper_list as global_get_copper_list_api,
  global_upgrade_copper as global_upgrade_copper_api,
  global_info_subscribe as global_info_subscribe_api,
  set_copper as set_copper_api,
  set_enemy as set_enemy_api,
  change_direction as change_direction_api,
  move_to as move_to_api,
  display_can_move as display_can_move_api,
  display_can_attack as display_can_attack_api,
  clear_state as clear_state_api,
  animate_move as animate_move_api,
  animate_reset as animate_reset_api,
  put_map_block as put_map_block_api,
  set_move_block as set_move_block_api,
  set_attack_block as set_attack_block_api,
  clear_block as clear_block_api,
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
