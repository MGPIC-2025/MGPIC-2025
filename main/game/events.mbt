///|
let setted_attack_blocks : Set[(Int, Int)] = Set::new()

///|
let setted_move_blocks : Set[(Int, Int)] = Set::new()

///|
/// 前端：当铜偶被点击
/// 后端：返回铜偶信息以供渲染信息栏
pub fn handle_on_click_copper(id : Int) -> Unit {
  @global_msg.msg_info.broadcast({
    type_msg: "handle_on_click_copper",
    content: ({ "copper": get_battle_copper_by_id(id).to_json() } : Json).stringify(),
  })
}

///|
/// 前端：当铜偶开始攻击
/// 搜索敌人并且设置可攻击状态地块
pub fn handle_on_attack_start(map : Map_, id : Int) -> Unit {
  let battle_copper = get_battle_copper_by_id(id)
  let attack_target = battle_copper.get_can_attack(map)
  for target in attack_target {
    let position = target.position
    set_attack_block(position)
    setted_attack_blocks.add(position)
  }
}

///|
/// 前端：当玩家取消攻击
/// 后端：清除可攻击的地块
pub fn handle_on_attack_end() -> Unit {
  for position in setted_attack_blocks {
    clear_block(position)
  }
  setted_attack_blocks.clear()
}

///|
/// 前端：当玩家实施攻击
/// 后端：计算攻击结果
pub fn handle_on_attack_apply(
  id : Int,
  position : (Int, Int),
  map : Map_,
) -> Unit {
  let battle_copper = get_battle_copper_by_id(id)
  let enemy = map.get_occupant(position)
  guard enemy is Enemy(enemy)
  let result = enemy.apply_attack(battle_copper.attribute.attack)
  // 单位被击杀
  if result {
    remove_unit(enemy.id)
    map.remove_occupant(position)
  }
}

///|
pub fn handle_on_move_start(map : Map_, id : Int) -> Unit {
  let battle_copper = get_battle_copper_by_id(id)
  let can_move = battle_copper.get_can_move(map)
  for position in can_move {
    set_move_block(position)
    setted_move_blocks.add(position)
  }
}

///|
/// 前端：当玩家取消移动
/// 后端：清除可移动的地块
pub fn handle_on_move_end() -> Unit {
  for position in setted_move_blocks {
    clear_block(position)
  }
  setted_move_blocks.clear()
}

///|
/// 前端：当玩家实施移动
/// 后端：计算移动结果
pub fn handle_on_move_apply(
  id : Int,
  position : (Int, Int),
  map : Map_,
) -> Unit {
  let battle_copper = get_battle_copper_by_id(id)
  if map.find_position_in_map(position) is Some(_) {
    // 如果仍在当前已有的房间内  
    // 移除旧位置的铜偶，并将其放到新位置
    let now_position = battle_copper.position
    let now_room = map.find_position_in_map(now_position).unwrap()
    now_room.blocks[now_position.0][now_position.1].occupant = Empty
    now_room.blocks[position.0][position.1].occupant = Occupant::Copper(
      battle_copper,
    )
    // 更新铜偶的位置
    battle_copper.position = position
    // 根据位置改变铜偶的朝向
    change_direction(
      id,
      convert_direction_to_unit_direction(
        get_direction_by_position(now_position, position),
      ),
    )
    // 移动铜偶到新位置
    move_to(id, position)
  } else {
    // 如果不在当前已有的房间内，则需要生成新的房间
    // 获取当前位置和当前房间
    let now_position = battle_copper.position
    let now_room = map.find_position_in_map(now_position).unwrap()
    // 获取新的房间中心位置和方向
    let (direction, new_position) = Room::get_room_direction_and_new_position(
      now_room, position,
    )
    // 生成房间，将其加入地图
    let new_room = Room::new(
      get_level_by_room_count(map.rooms.length() + 1),
      new_position,
      Set::from_array([new_position]),
    )
    Map_::add_room(map, new_room)
    // 移除旧房间的铜偶，并将其加入新房间
    now_room.blocks[now_position.0][now_position.1].occupant = Empty
    new_room.blocks[new_position.0][new_position.1].occupant = Occupant::Copper(
      battle_copper,
    )
    // 根据位置改变铜偶的朝向
    change_direction(id, convert_direction_to_unit_direction(direction))
    // 更新铜偶的位置
    battle_copper.position = new_position
    // 移动铜偶到新位置
    move_to(id, new_position)
  }
  for position in setted_move_blocks {
    clear_block(position)
  }
  setted_move_blocks.clear()
}

///|
/// 前端：当游戏开始，注意玩家需要选择三个铜偶加入游戏，这个界面由 @fgeygfe 来做，就是给一个界面从铜偶仓库里面选出来三个，然后给出他们的 id 就好
/// 后端：根据 id 生成铜偶，并将其加入游戏，放置铜偶在地图的开始位置，设置铜偶的朝向为朝向前方
pub fn handle_on_game_start(ids : Array[Int]) -> Unit {
  let warehouse = @global.global.warehouse
  let copper_1 = BattleCopper::new(warehouse.get_copper(ids[0]), ids[0], (0, 6))
  let copper_2 = BattleCopper::new(warehouse.get_copper(ids[1]), ids[1], (0, 7))
  let copper_3 = BattleCopper::new(warehouse.get_copper(ids[2]), ids[2], (0, 8))
  current_game.val = Some(Game::new())
  set_copper(copper_1, ids[0], (0, 6))
  set_copper(copper_2, ids[1], (0, 7))
  set_copper(copper_3, ids[2], (0, 8))
  change_direction(ids[0], PositiveY)
  change_direction(ids[1], PositiveY)
  change_direction(ids[2], PositiveY)
}
