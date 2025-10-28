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
    {
      "type": "on_transfer_start",
      "content": { "id": id, "index": index, "count": count, .. },
      ..
    } =>
      handle_on_transfer_start(
        string_to_int(id),
        string_to_int(index),
        string_to_int(count),
      )
    { "type": "on_transfer_end", .. } => handle_on_transfer_end()
    {
      "type": "on_transfer_apply",
      "content": { "position": { "x": x, "y": y, .. }, .. },
      ..
    } => handle_on_transfer_apply((string_to_int(x), string_to_int(y)))
    {
      "type": "on_copper_pick_up",
      "content": { "id": id, "index": index, .. },
      ..
    } => handle_on_copper_pick_up(string_to_int(id), string_to_int(index))
    {
      "type": "on_copper_drop_item",
      "content": { "id": id, "index": index, .. },
      ..
    } => handle_on_copper_drop_item(string_to_int(id), string_to_int(index))
    { "type": "on_copper_craft", "content": { "id": id, .. }, .. } =>
      handle_on_copper_craft(string_to_int(id))
    {
      "type": "on_copper_equip_item",
      "content": { "id": id, "index": index, .. },
      ..
    } => handle_on_copper_equip_item(string_to_int(id), string_to_int(index))
    {
      "type": "on_copper_unequip_item",
      "content": { "id": id, "index": index, .. },
      ..
    } => handle_on_copper_unequip_item(string_to_int(id), string_to_int(index))
    { "type": "on_game_round_pass", .. } => handle_game_round_pass()
    _ => abort("Invalid message")
  }
}

///|
fn string_to_int(json : Json) -> Int {
  try! @strconv.parse_int(json.as_string().unwrap())
}
