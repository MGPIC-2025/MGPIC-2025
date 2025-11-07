///|
/// 前端：当铜偶被点击
/// 后端：返回铜偶信息以供渲染信息栏
/// 注意：这里的资源是地图块上的资源，不是铜偶背包里的资源
fn handle_on_click_copper(id : Int) -> Unit {
  // 清除所有范围显示（切换铜偶时）
  handle_on_move_end()
  handle_on_attack_end()
  handle_on_transfer_end()
  handle_on_summon_end()
  let battle_copper = get_battle_copper_by_id(id)
  let position = battle_copper.position
  let map = force_get_current_map()
  let map_block = map.global_position_to_room_position(position)
  guard map_block is Some((room, position))
  let resource = room.blocks[position.0][position.1].resources
  // 检查是否有攻击目标
  let attack_targets = battle_copper.get_can_attack(map)
  let has_attack_targets = attack_targets.length() > 0
  @global_msg.msg_info.broadcast({
    type_msg: "handle_on_click_copper",
    content: (
      {
        "copper": get_battle_copper_by_id(id).to_json(),
        "resources": resource.to_json(),
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
  // 先清除之前的移动范围和攻击范围
  handle_on_move_end()
  handle_on_attack_end()
  handle_on_transfer_end()
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
/// 前端：当玩家取消攻击
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
  // 验证攻击位置是否在有效范围内
  if not(setted_attack_blocks.contains(position)) {
    // 位置无效，保持范围显示，等待玩家重新选择
    return
  }
  // 攻击前将视角聚焦到铜偶
  animate_move(id)
  let battle_copper = get_battle_copper_by_id(id)
  let target = map.get_occupant(position)
  match target {
    Enemy(enemy) => {
      let result = enemy.apply_attack(battle_copper.attribute.attack)
      // 单位被击杀
      if result {
        let drop_items = enemy.get_drop_items()
        for drop_item in drop_items {
          map.add_resource(enemy.position, drop_item)
        }
        // 如果有掉落物，显示资源标记
        if drop_items.length() > 0 {
          put_resource_marker(enemy.position)
        }
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
    // 目标已经死亡或不存在，清除攻击范围但不消耗攻击机会
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
  if not(target is Empty) {
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
  handle_on_transfer_end()
  handle_on_summon_end()
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
  // 验证移动位置是否在有效范围内
  if not(setted_move_blocks.contains(position)) {
    // 位置无效，保持范围显示，等待玩家重新选择
    return
  }
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
    // 生成房间，将其加入地图
    let new_room = Room::new(
      get_level_by_room_count(map.rooms.length() + 1),
      new_room_index,
      Set::from_array([new_room_index]),
    )
    Map_::add_room(map, new_room)
    // 移除旧房间的铜偶
    now_room.blocks[now_local_pos.0][now_local_pos.1].occupant = Empty
    // 计算铜偶在新房间内的本地位置
    // 玩家点击的position是全局坐标，需要转换为新房间的本地坐标
    let new_local_x = position.0 - new_room_index.0
    let new_local_y = position.1 - new_room_index.1
    // 将铜偶放入新房间
    new_room.blocks[new_local_x][new_local_y].occupant = Occupant::Copper(
      battle_copper,
    )
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

///|
/// 前端：当玩家开始转移某个铜偶物品到其他铜偶
/// 后端：设置可转移的地块
/// index 是物品在铜偶背包中的索引，从 0 开始
fn handle_on_transfer_start(id : Int, index : Int, count : Int) -> Unit {
  // 先清除之前的移动范围和攻击范围
  handle_on_move_end()
  handle_on_attack_end()
  handle_on_transfer_end()
  handle_on_summon_end()
  transfer_from_id.val = Some(id)
  let battle_copper = get_battle_copper_by_id(id)
  let item_type = battle_copper.inventory.items[index].item_type
  item_to_be_transfer.val = Some(Item::new(item_type, count~))
  let map = force_get_current_map()
  let transfer_position = battle_copper.get_transfer_position(
    item_to_be_transfer.val.unwrap(),
    map,
  )
  for position in transfer_position {
    set_attack_block(position)
    setted_transfer_blocks.add(position)
  }
}

///|
/// 前端：当玩家取消转移
/// 后端：清除可转移的地块
fn handle_on_transfer_end() -> Unit {
  for position in setted_transfer_blocks {
    clear_block(position)
    check_and_reset_block(position, Attack)
  }
  setted_transfer_blocks.clear()
  transfer_from_id.val = None
  item_to_be_transfer.val = None
}

///|
/// 前端：当玩家实施转移
/// 后端：计算转移结果
fn handle_on_transfer_apply(position : (Int, Int)) -> Unit {
  let battle_copper = get_battle_copper_by_id(transfer_from_id.val.unwrap())
  let map = force_get_current_map()
  guard map.get_occupant(position) is Copper(copper)
  battle_copper.transfer(copper.id, item_to_be_transfer.val.unwrap())
  for position in setted_transfer_blocks {
    clear_block(position)
    check_and_reset_block(position, Attack)
  }
  setted_transfer_blocks.clear()
  transfer_from_id.val = None
  item_to_be_transfer.val = None
}

///|
/// 前端：当玩家拾取地上的物品
/// 后端：计算拾取结果
/// 注意这里的 index 是地图块上的资源索引，从 0 开始。
/// 这个 event 开始的时候，前端应该已经开始尝试拾取资源了（资源在 click 的时候就已经给前端了）
/// 前端只需要在 event 执行完毕后刷新资源栏即可（比如再发送一次 click 事件来获取）
fn handle_on_copper_pick_up(id : Int, index : Int) -> Unit {
  // 检查是否是友方召唤物（敌人实体）
  if enemy_map.contains(id) {
    // 友方召唤物没有背包，直接提示无法拾取
    @global_msg.msg_info.broadcast({
      type_msg: "cannot_pick_up_item",
      content: ({ "message": "无法拾取该物品" } : Json).stringify(),
    })
    return
  }
  let battle_copper = get_battle_copper_by_id(id)
  let map = force_get_current_map()
  let map_block = map.global_position_to_room_position(battle_copper.position)
  guard map_block is Some((room, position))
  let resource = room.blocks[position.0][position.1].resources
  let item = resource[index]
  if battle_copper.inventory.check_can_add_item(item.item_type) {
    battle_copper.inventory.add_item(item)
    room.blocks[position.0][position.1].resources.remove(index) |> ignore

    // 如果该格子没有资源了，清除资源标记
    if room.blocks[position.0][position.1].resources.length() == 0 {
      clear_resource_marker(battle_copper.position)
    }
  } else {
    @global_msg.msg_info.broadcast({
      type_msg: "cannot_pick_up_item",
      content: ({ "message": "无法拾取该物品" } : Json).stringify(),
    })
  }
}

///|
/// 前端：当玩家丢出物品
/// 后端：计算丢出结果
fn handle_on_copper_drop_item(id : Int, index : Int) -> Unit {
  let battle_copper = get_battle_copper_by_id(id)
  let item = battle_copper.inventory.items[index]
  battle_copper.inventory.remove_item(index) |> ignore
  let map = force_get_current_map()
  map.add_resource(battle_copper.position, item)

  // 在该位置放置资源标记
  put_resource_marker(battle_copper.position)
}

///|
/// 前端：当玩家合成物品
/// 后端：尝试合成灵光火花
fn handle_on_copper_craft(id : Int) -> Unit {
  let battle_copper = get_battle_copper_by_id(id)
  let success = battle_copper.inventory.craft()
  if success {
    @global_msg.msg_info.broadcast({
      type_msg: "craft_success",
      content: ({ "message": "合成成功：获得灵光火花" } : Json).stringify(),
    })
  } else {
    @global_msg.msg_info.broadcast({
      type_msg: "craft_failed",
      content: ({ "message": "合成失败：材料不足" } : Json).stringify(),
    })
  }
}

///|
/// 前端：当玩家装备物品
/// 后端：计算装备结果
/// index 为装备在物品栏中的索引，前端应该限制只能选中装备
fn handle_on_copper_equip_item(id : Int, index : Int) -> Unit {
  let battle_copper = get_battle_copper_by_id(id)
  let item = battle_copper.inventory.items[index]
  guard item.item_type is Equipment(equipment)
  let (new_equipment_slot, success) = battle_copper.copper.equipment_slot.equip(
    equipment,
  )
  if success {
    battle_copper.copper.equipment_slot = new_equipment_slot
    battle_copper.copper.attribute = battle_copper.copper.attribute.merge(
      equipment.equipment_base.attribute,
    )
  } else {
    @global_msg.msg_info.broadcast({
      type_msg: "equipment_slot_full",
      content: ({ "message": "装备槽已满" } : Json).stringify(),
    })
  }
}

///|
/// 前端：当玩家卸下装备
/// 后端：计算卸下结果
/// index 为装备在装备槽中的索引（从 0 开始），这个操作是可能会失败的，前端需要记得刷新一下装备栏
fn handle_on_copper_unequip_item(id : Int, index : Int) -> Unit {
  let battle_copper = get_battle_copper_by_id(id)
  let equipment_slot_before = battle_copper.copper.equipment_slot
  let equipment = match index {
    0 => equipment_slot_before.slot1.unwrap()
    1 => equipment_slot_before.slot2.unwrap()
    _ => abort("Invalid index")
  }
  let negative_attribute = @attribute.Attribute::new(
    health=-equipment.equipment_base.attribute.health,
    attack=-equipment.equipment_base.attribute.attack,
    defense=-equipment.equipment_base.attribute.defense,
    dodge=-equipment.equipment_base.attribute.dodge,
  )
  if battle_copper.inventory.check_can_add_item(Equipment(equipment)) {
    let equipment_slot = battle_copper.copper.equipment_slot.unequip(index)
    battle_copper.copper.equipment_slot = equipment_slot
    battle_copper.copper.attribute = battle_copper.copper.attribute.merge(
      negative_attribute,
    )
  } else {
    @global_msg.msg_info.broadcast({
      type_msg: "inventory_full",
      content: ({ "message": "背包已满" } : Json).stringify(),
    })
  }
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
  handle_on_transfer_end()
  handle_on_summon_end()
  let battle_copper = get_battle_copper_by_id(id)
  let map = force_get_current_map()
  let can_summon = battle_copper.get_can_move(map)
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
  let enemy_idx = enemy_list.search_by(enemy => enemy.name == name).unwrap()
  let enemy_base = enemy_list[enemy_idx]
  let resource_cost = enemy_base.summon_cost
  let battle_copper = get_battle_copper_by_id(id)

  // 检查召唤位置是否有效（在地图范围内且未被占据）
  if map.is_occupy(position) {
    @global_msg.msg_info.broadcast({
      type_msg: "summon_failed",
      content: ({ "message": "召唤位置已被占据" } : Json).stringify(),
    })
    return
  }

  // 检查位置是否在有效房间内
  guard map.global_position_to_room_position(position) is Some(_) else {
    @global_msg.msg_info.broadcast({
      type_msg: "summon_failed",
      content: ({ "message": "召唤位置无效" } : Json).stringify(),
    })
    return
  }
  if battle_copper.inventory.check_resource_cost_in_inventory(resource_cost) {
    battle_copper.inventory.consume_resource_cost(resource_cost)

    // 创建友方召唤物（owned=true 的 Enemy）
    let summoned_enemy = Enemy::new(
      enemy_base, position, true, // owned=true 友方召唤物
    )

    // 添加到地图（作为Enemy）
    map.add_occupant(position, Occupant::Enemy(summoned_enemy))

    // 通知前端创建敌人模型（前端会根据model_url加载）
    // 注意：set_enemy 会在内部完成后自动调用 update_health 显示血条
    set_enemy(summoned_enemy, summoned_enemy.id, position)
    // 显示召唤物状态（绿圈/红圈）
    summoned_enemy.update_move_and_attack_and_summon_status()

    // 召唤完成，设置召唤者的召唤状态为 false
    battle_copper.can_summon = false
    battle_copper.update_move_and_attack_and_summon_status()

    // 清除召唤范围地板块
    for summon_position in setted_can_summon_blocks {
      clear_block(summon_position)
      check_and_reset_block(summon_position, Summon)
    }
    setted_can_summon_blocks.clear()
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
