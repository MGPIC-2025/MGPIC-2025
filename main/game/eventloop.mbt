// 游戏事件主循环
// 注意数字也要转换成字符串发，我怕后端这里 as_number 再 to_int 可能有精度问题

///|
pub fn eventloop(msg : String) -> Unit {
  let msg = try! @json.parse(msg)
  match msg {
    { "type": "on_click_copper", "content": { "id": id, .. }, .. } =>
      handle_on_click_copper(string_to_int(id))
    { "type": "on_attack_start", "content": { "id": id, .. }, .. } =>
      handle_on_attack_start(force_get_current_map(), string_to_int(id))
    { "type": "on_attack_end", .. } => handle_on_attack_end()
    {
      "type": "on_attack_apply",
      "content": { "id": id, "position": { "x": x, "y": y, .. }, .. },
      ..
    } =>
      handle_on_attack_apply(
        string_to_int(id),
        (string_to_int(x), string_to_int(y)),
        force_get_current_map(),
      )
    { "type": "on_move_start", "content": { "id": id, .. }, .. } =>
      handle_on_move_start(force_get_current_map(), string_to_int(id))
    { "type": "on_move_end", .. } => handle_on_move_end()
    {
      "type": "on_move_apply",
      "content": { "id": id, "position": { "x": x, "y": y, .. }, .. },
      ..
    } =>
      handle_on_move_apply(
        string_to_int(id),
        (string_to_int(x), string_to_int(y)),
        force_get_current_map(),
      )
    { "type": "on_game_start", "content": { "ids": ids, .. }, .. } =>
      handle_on_game_start(ids.as_array().unwrap().map(string_to_int))
    { "type": "on_game_round_pass", .. } => handle_game_round_pass()
    { "type": "on_click_enemy", "content": { "id": id, .. }, .. } =>
      handle_on_click_enemy(string_to_int(id))
    { "type": "on_enemy_attack_start", "content": { "id": id, .. }, .. } =>
      handle_on_enemy_attack_start(force_get_current_map(), string_to_int(id))
    { "type": "on_enemy_attack_end", .. } => handle_on_enemy_attack_end()
    {
      "type": "on_enemy_attack_apply",
      "content": { "id": id, "position": { "x": x, "y": y, .. }, .. },
      ..
    } =>
      handle_on_enemy_attack_apply(
        string_to_int(id),
        (string_to_int(x), string_to_int(y)),
        force_get_current_map(),
      )
    { "type": "on_enemy_move_start", "content": { "id": id, .. }, .. } =>
      handle_on_enemy_move_start(force_get_current_map(), string_to_int(id))
    { "type": "on_enemy_move_end", .. } => handle_on_enemy_move_end()
    {
      "type": "on_enemy_move_apply",
      "content": { "id": id, "position": { "x": x, "y": y, .. }, .. },
      ..
    } =>
      handle_on_enemy_move_apply(
        string_to_int(id),
        (string_to_int(x), string_to_int(y)),
        force_get_current_map(),
      )
    { "type": "on_get_summon_menu", .. } => handle_on_get_summon_menu()
    { "type": "on_summon_start", "content": { "id": id, .. }, .. } =>
      handle_on_summon_start(string_to_int(id))
    {
      "type": "on_summon_apply",
      "content": {
        "id": id,
        "position": { "x": x, "y": y, .. },
        "name": name,
        ..
      },
      ..
    } =>
      handle_on_summon_apply(
        string_to_int(id),
        (string_to_int(x), string_to_int(y)),
        force_get_current_map(),
        name.as_string().unwrap(),
      )
    { "type": "on_summon_end", .. } => handle_on_summon_end()
    { "type": "on_click_structure", "content": { "id": id, .. }, .. } =>
      handle_on_click_structure(string_to_int(id))
    { "type": "on_get_structure_menu", .. } => handle_on_get_structure_menu()
    {
      "type": "on_structure_build_start",
      "content": { "id": id, "name": name, .. },
      ..
    } =>
      handle_on_structure_build_start(
        string_to_int(id),
        name.as_string().unwrap(),
      )
    {
      "type": "on_structure_build_apply",
      "content": {
        "id": id,
        "position": { "x": x, "y": y, .. },
        "name": name,
        ..
      },
      ..
    } =>
      handle_on_structure_build_apply(
        string_to_int(id),
        (string_to_int(x), string_to_int(y)),
        force_get_current_map(),
        name.as_string().unwrap(),
      )
    { "type": "on_structure_build_end", .. } => handle_on_structure_build_end()
    { "type": "on_structure_attack_start", "content": { "id": id, .. }, .. } =>
      handle_on_structure_attack_start(
        force_get_current_map(),
        string_to_int(id),
      )
    { "type": "on_structure_attack_end", .. } =>
      handle_on_structure_attack_end()
    {
      "type": "on_structure_attack_apply",
      "content": { "id": id, "position": { "x": x, "y": y, .. }, .. },
      ..
    } =>
      handle_on_structure_attack_apply(
        string_to_int(id),
        (string_to_int(x), string_to_int(y)),
        force_get_current_map(),
      )
    _ => abort("Invalid message")
  }
}

///|
fn string_to_int(json : Json) -> Int {
  try! @strconv.parse_int(json.as_string().unwrap())
}
