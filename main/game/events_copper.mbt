///|
/// 前端：当铜偶被点击
/// 后端：返回铜偶信息以供渲染信息栏
fn handle_on_click_copper(id : Int) -> Unit {
  // 清除所有范围显示（切换铜偶时）
  handle_on_move_end()
  handle_on_attack_end()
  handle_on_summon_end()
  let battle_copper = get_battle_copper_by_id(id)
  let map = force_get_current_map()
  let has_attack_targets = !battle_copper.get_can_attack(map).is_empty()
  @global_msg.msg_info.broadcast({
    type_msg: "handle_on_click_copper",
    content: (
      {
        "copper": get_battle_copper_by_id(id).to_json(),
        "has_attack_targets": has_attack_targets,
      } : Json).stringify(),
  })
  // 显示铜偶的状态圈圈（绿色/红色/黄色）
  battle_copper.update_move_and_attack_and_summon_status()
}

///|
/// 前端：当铜偶开始攻击
/// 搜索敌人并且设置可攻击状态地块
fn handle_on_attack_start(map : Map_, id : Int) -> Unit {
  handle_on_move_end()
  handle_on_attack_end()
  handle_on_summon_end()
  let battle_copper = get_battle_copper_by_id(id)
  let attack_target = battle_copper.get_can_attack(map)
  for target in attack_target {
    let position = target.get_position_from_can_attack_target()
    set_attack_block(position)
    setted_attack_blocks.add(position)
  }
}

///|
/// 前端：当玩家取消或结束攻击
/// 后端：清除可攻击的地块
fn handle_on_attack_end() -> Unit {
  for position in setted_attack_blocks {
    clear_block(position)
    check_and_reset_block(position, Attack)
  }
  setted_attack_blocks.clear()
}

///|
/// 前端：当玩家实施攻击
/// 后端：计算攻击结果
fn handle_on_attack_apply(id : Int, position : (Int, Int), map : Map_) -> Unit {
  // 攻击前将视角聚焦到铜偶
  animate_move(id)
  let battle_copper = get_battle_copper_by_id(id)
  let target = map.get_occupant(position)
  match target {
    Enemy(enemy) => {
      let result = enemy.apply_attack(battle_copper.attribute.attack)
      // 单位被击杀
      if result {
        @global.global.bag.add_resource(enemy.get_drop_items())
        enemy_map.remove(enemy.id)
        remove_unit(enemy.id)
        map.remove_occupant(enemy.position)
      } else {
        // 更新敌人血量显示
        update_health(enemy.id, enemy.now_health, enemy.enemy_base.health)
      }
      battle_copper.can_attack = false
      battle_copper.update_move_and_attack_and_summon_status()
    }
    Copper(copper) => {
      copper.apply_mechanic_heal(battle_copper.attribute.attack)
      // 更新铜偶血量显示
      update_health(
        copper.id,
        copper.now_health,
        copper.copper.attribute.health,
      )
      battle_copper.can_attack = false
      battle_copper.update_move_and_attack_and_summon_status()
    }
    Structure(structure) => {
      let result = structure.apply_attack(battle_copper.attribute.attack)
      if result {
        structure_map.remove(structure.id)
        remove_unit(structure.id)
        map.remove_occupant(structure.position)
      } else {
        // 更新建筑血量显示
        update_health(
          structure.id,
          structure.now_health,
          structure.structure_base.health,
        )
      }
      battle_copper.can_attack = false
      battle_copper.update_move_and_attack_and_summon_status()
    }
    Empty => ()
    _ => abort("target is not enemy or copper")
  }
  // 无论如何都要清除攻击范围
  for position in setted_attack_blocks {
    clear_block(position)
    check_and_reset_block(position, Attack)
  }
  setted_attack_blocks.clear()
  // 只有成功攻击才发送完成消息
  if !(target is Empty) {
    attack_complete(id)
  }
}

///|
/// 前端：当玩家开始移动
/// 后端：设置可移动的地块
fn handle_on_move_start(map : Map_, id : Int) -> Unit {
  // 先清除之前的移动范围和攻击范围
  handle_on_move_end()
  handle_on_attack_end()
  handle_on_summon_end()
  let battle_copper = get_battle_copper_by_id(id)
  let can_move = battle_copper.get_can_move(map)
  for position in can_move {
    set_move_block(position)
    setted_move_blocks.add(position)
  }
}

///|
/// 前端：当玩家或结束移动
/// 后端：清除可移动的地块
fn handle_on_move_end() -> Unit {
  for position in setted_move_blocks {
    clear_block(position)
    check_and_reset_block(position, Move)
  }
  setted_move_blocks.clear()
}

///|
/// 前端：当玩家实施移动
/// 后端：计算移动结果
fn handle_on_move_apply(id : Int, position : (Int, Int), map : Map_) -> Unit {
  // 移动前将视角聚焦到铜偶
  animate_move(id)
  let battle_copper = get_battle_copper_by_id(id)
  if map.find_position_in_map(position) is Some(_) {
    // 如果仍在当前已有的房间内  
    // 移除旧位置的铜偶，并将其放到新位置
    let now_position = battle_copper.position
    // 将全局坐标转换为房间本地坐标
    let (now_room, now_local_pos) = map
      .global_position_to_room_position(now_position)
      .unwrap()
    let (target_room, target_local_pos) = map
      .global_position_to_room_position(position)
      .unwrap()
    now_room.blocks[now_local_pos.0][now_local_pos.1].occupant = Empty
    target_room.blocks[target_local_pos.0][target_local_pos.1].occupant = Occupant::Copper(
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
    let (now_room, now_local_pos) = map
      .global_position_to_room_position(now_position)
      .unwrap()
    // 获取新的房间索引位置和方向
    let (_, new_room_index) = Room::get_room_direction_and_new_position(
      now_room, position,
    )
    // 计算铜偶在新房间内的本地位置
    let new_local_x = position.0 - new_room_index.0
    let new_local_y = position.1 - new_room_index.1
    // 生成房间，将其加入地图，并排除铜偶的位置来生成敌人
    let new_room = Room::new(
      get_level_by_room_count(map.rooms.length() + 1),
      new_room_index,
      Set::from_array([(new_local_x, new_local_y)]),
    )
    Map_::add_room(map, new_room)
    // 移除旧房间的铜偶
    now_room.blocks[now_local_pos.0][now_local_pos.1].occupant = Empty
    // 将铜偶放入新房间
    new_room.blocks[new_local_x][new_local_y].occupant = Copper(battle_copper)
    // 广播新房间的内容到前端
    broadcast_room_content(new_room)
    // 根据位置改变铜偶的朝向（使用get_direction_by_position计算正确的朝向）
    change_direction(
      id,
      convert_direction_to_unit_direction(
        get_direction_by_position(now_position, position),
      ),
    )
    // 更新铜偶的位置（全局坐标）
    battle_copper.position = position
    // 移动铜偶到新位置（全局坐标）
    move_to(id, position)
  }
  battle_copper.can_move = false
  battle_copper.update_move_and_attack_and_summon_status()
  for position in setted_move_blocks {
    clear_block(position)
    check_and_reset_block(position, Move)
  }
  setted_move_blocks.clear()
}

// 共鸣者召唤流程：
// 1. 玩家点击共鸣者
// 2. 选择空位召唤敌人
// 3. 打开敌人召唤菜单
// 4. 玩家选择敌人
// 5. 敌人召唤到地图上

///|
/// 前端：当铜偶开始召唤
/// 后端：放置召唤物占位符
fn handle_on_summon_start(id : Int) -> Unit {
  handle_on_move_end()
  handle_on_attack_end()
  handle_on_summon_end()
  let battle_copper = get_battle_copper_by_id(id)
  let map = force_get_current_map()
  let can_summon = battle_copper.get_summon_position(map)
  for position in can_summon {
    set_can_summon_blocks(position)
    setted_can_summon_blocks.add(position)
  }
}

///|
/// 后端：实施召唤
/// 需要指定召唤的敌人以及消耗的资源，并且召唤铜偶（使用敌人外观）到地图上
fn handle_on_summon_apply(
  id : Int,
  position : (Int, Int),
  map : Map_,
  name : String,
) -> Unit {
  let enemy_base = enemy_info_map.get(name).unwrap()
  let resource_cost = enemy_base.summon_cost
  let battle_copper = get_battle_copper_by_id(id)
  if @global.global.bag.resources.check_resource_cost(resource_cost) {
    @global.global.bag.resources.consume_resource_cost(resource_cost)
    let summoned_enemy = Enemy::new(enemy_base, position, true)
    map.add_occupant(position, Enemy(summoned_enemy))
    set_enemy(summoned_enemy, summoned_enemy.id, position)
    summoned_enemy.update_move_and_attack_and_summon_status()
    battle_copper.can_summon = false
    battle_copper.update_move_and_attack_and_summon_status()
  } else {
    @global_msg.msg_info.broadcast({
      type_msg: "resource_not_enough",
      content: ({ "message": "资源不足" } : Json).stringify(),
    })
  }
}

///|
/// 前端：当铜偶结束召唤
/// 后端：清除可召唤的地块
fn handle_on_summon_end() -> Unit {
  for position in setted_can_summon_blocks {
    clear_block(position)
    check_and_reset_block(position, Summon)
  }
  setted_can_summon_blocks.clear()
}

///|
/// 前端：当玩家获取敌人召唤菜单
/// 后端：返回敌人召唤菜单
/// 需要可以选择敌人以及确定资源消耗
fn handle_on_get_summon_menu() -> Unit {
  @global_msg.msg_info.broadcast({
    type_msg: "get_summon_menu",
    content: ({ "contents": enemy_list.to_json() } : Json).stringify(),
  })
}

// 备注：建筑用的圈和召唤用的圈一样

///|
/// 前端：当玩家获取结构建造菜单
/// 后端：返回结构建造菜单
/// 需要可以选择结构以及确定资源消耗
fn handle_on_get_structure_menu() -> Unit {
  @global_msg.msg_info.broadcast({
    type_msg: "get_structure_menu",
    content: ({ "contents": structure_info_list.to_json() } : Json).stringify(),
  })
}

///|
fn handle_on_structure_build_start(id : Int, name : String) -> Unit {
  handle_on_move_end()
  handle_on_attack_end()
  handle_on_summon_end()
  let battle_copper = get_battle_copper_by_id(id)
  let map = force_get_current_map()
  let can_build = battle_copper.get_structure_build_position(
    map,
    is_drill=name == "心源矿钻",
  )
  for position in can_build {
    set_can_summon_blocks(position)
    setted_can_summon_blocks.add(position)
  }
}

///|
fn handle_on_structure_build_apply(
  id : Int,
  position : (Int, Int),
  map : Map_,
  name : String,
) -> Unit {
  let structure_base = structure_info_map.get(name).unwrap()
  let resource_cost = structure_base.cost
  let battle_copper = get_battle_copper_by_id(id)
  if @global.global.bag.resources.check_resource_cost(resource_cost) {
    @global.global.bag.resources.consume_resource_cost(resource_cost)
    let resource_type = if name == "心源矿钻" {
      let material = map.get_occupant(position)
      guard material is Material(material)
      map.remove_occupant(position)
      remove_unit(material.id)
      Some(material.material_base.resource_type)
    } else {
      None
    }
    let structure = Structure::new(
      structure_base,
      owned=true,
      resource_type~,
      position,
    )
    map.add_occupant(position, Occupant::Structure(structure))
    set_structure(structure, structure.id, position)
    battle_copper.can_build = false
    structure.update_move_and_attack_and_summon_status()
    // 建造成功，清理黄色方块
    handle_on_structure_build_end()
  } else {
    @global_msg.msg_info.broadcast({
      type_msg: "resource_not_enough",
      content: ({ "message": "资源不足" } : Json).stringify(),
    })
    // 建造失败，也要清理黄色方块
    handle_on_structure_build_end()
  }
}

///|
fn handle_on_structure_build_end() -> Unit {
  for position in setted_can_summon_blocks {
    clear_block(position)
    check_and_reset_block(position, Summon)
  }
  setted_can_summon_blocks.clear()
}
