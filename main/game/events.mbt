///|
let setted_attack_blocks : Set[(Int, Int)] = Set::new()

///|
let setted_move_blocks : Set[(Int, Int)] = Set::new()

///|
let setted_transfer_blocks : Set[(Int, Int)] = Set::new()

///|
let transfer_from_id : Ref[Int?] = Ref::new(None)

///|
let item_to_be_transfer : Ref[Item?] = Ref::new(None)

///|
priv enum IgnoreBlock {
  Attack
  Move
}

///|
fn check_and_reset_block(
  position : (Int, Int),
  ignore_block : IgnoreBlock,
) -> Unit {
  // 清除攻击块时，检查是否需要恢复移动块或转移块
  if ignore_block is Attack {
    if setted_move_blocks.contains(position) {
      set_move_block(position)
    } else if setted_transfer_blocks.contains(position) {
      set_attack_block(position)
    }
  }
  // 清除移动块时，检查是否需要恢复攻击块或转移块
  if ignore_block is Move {
    if setted_attack_blocks.contains(position) {
      set_attack_block(position)
    } else if setted_transfer_blocks.contains(position) {
      set_attack_block(position)
    }
  }
}

///|
/// 前端：当铜偶被点击
/// 后端：返回铜偶信息以供渲染信息栏
/// 注意：这里的资源是地图块上的资源，不是铜偶背包里的资源
pub fn handle_on_click_copper(id : Int) -> Unit {
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
}

///|
/// 前端：当铜偶开始攻击
/// 搜索敌人并且设置可攻击状态地块
pub fn handle_on_attack_start(map : Map_, id : Int) -> Unit {
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
pub fn handle_on_attack_end() -> Unit {
  for position in setted_attack_blocks {
    clear_block(position)
    check_and_reset_block(position, Attack)
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
  // 验证攻击位置是否在有效范围内
  if not(setted_attack_blocks.contains(position)) {
    // 位置无效，保持范围显示，等待玩家重新选择
    return
  }
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
        enemy_map.remove(enemy.id)
        remove_unit(enemy.id)
        map.remove_occupant(position)
      }
    }
    Copper(copper) => copper.apply_mechanic_heal(battle_copper.attribute.attack)
    _ => abort("Target is not enemy or copper")
  }
  battle_copper.can_attack = false
  battle_copper.update_move_and_attack_status()
  for position in setted_attack_blocks {
    clear_block(position)
    check_and_reset_block(position, Attack)
  }
  setted_attack_blocks.clear()
  // 发送攻击完成消息
  attack_complete(id)
}

///|
/// 前端：当玩家开始移动
/// 后端：设置可移动的地块
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
    check_and_reset_block(position, Move)
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
  // 验证移动位置是否在有效范围内
  if not(setted_move_blocks.contains(position)) {
    // 位置无效，保持范围显示，等待玩家重新选择
    return
  }
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
    let (direction, new_room_index) = Room::get_room_direction_and_new_position(
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

    // 根据位置改变铜偶的朝向
    change_direction(id, convert_direction_to_unit_direction(direction))
    // 更新铜偶的位置（全局坐标）
    battle_copper.position = position
    // 移动铜偶到新位置（全局坐标）
    move_to(id, position)
  }
  battle_copper.can_move = false
  battle_copper.update_move_and_attack_status()
  for position in setted_move_blocks {
    clear_block(position)
    check_and_reset_block(position, Move)
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
  let map = force_get_current_map()
  let first_room = map.rooms[0]
  first_room.blocks[0][6].occupant = Occupant::Copper(copper_1)
  first_room.blocks[0][7].occupant = Occupant::Copper(copper_2)
  first_room.blocks[0][8].occupant = Occupant::Copper(copper_3)
  broadcast_room_content(first_room)
  change_direction(ids[0], PositiveY)
  change_direction(ids[1], PositiveY)
  change_direction(ids[2], PositiveY)

  // 显示铜偶的初始状态圈（绿圈和红圈）
  copper_1.update_move_and_attack_status()
  copper_2.update_move_and_attack_status()
  copper_3.update_move_and_attack_status()
}

///|
/// 前端：当玩家开始转移某个铜偶物品到其他铜偶
/// 后端：设置可转移的地块
/// index 是物品在铜偶背包中的索引，从 0 开始
pub fn handle_on_transfer_start(id : Int, index : Int, count : Int) -> Unit {
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
pub fn handle_on_transfer_end() -> Unit {
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
pub fn handle_on_transfer_apply(position : (Int, Int)) -> Unit {
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
pub fn handle_on_copper_pick_up(id : Int, index : Int) -> Unit {
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
pub fn handle_on_copper_drop_item(id : Int, index : Int) -> Unit {
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
pub fn handle_on_copper_craft(id : Int) -> Unit {
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
pub fn handle_on_copper_equip_item(id : Int, index : Int) -> Unit {
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
pub fn handle_on_copper_unequip_item(id : Int, index : Int) -> Unit {
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

///|
/// 前端：当游戏回合结束
/// 后端：清除可攻击和可移动的地块，并恢复铜偶的可移动和可攻击状态
fn handle_game_round_pass() -> Unit {
  // 重新设置地砖状态
  for attack_block in setted_attack_blocks {
    clear_block(attack_block)
  }
  setted_attack_blocks.clear()
  for move_block in setted_move_blocks {
    clear_block(move_block)
  }
  setted_move_blocks.clear()
  for transfer_block in setted_transfer_blocks {
    clear_block(transfer_block)
  }
  setted_transfer_blocks.clear()
  // 恢复铜偶状态
  for battle_copper in battle_copper_map.values() {
    battle_copper.can_move = true
    // 根据铜偶类型设置攻击能力：工匠和共鸣者不能攻击
    battle_copper.can_attack = match battle_copper.copper.copper_type {
      CraftsMan | Resonator => false
      _ => true
    }
    battle_copper.update_move_and_attack_status()
  }
  // 敌人开始寻找攻击目标
  let map = force_get_current_map()
  let enemys = enemy_map.values()
  for enemy in enemys {
    let attack_targets = enemy.get_attack_targets(map)
    // 如果攻击范围内有可以攻击的目标，则直接开始攻击
    if attack_targets.length() > 0 {
      let attack_target = attack_targets[0]
      animate_move(enemy.id)
      match attack_target {
        Enemy(_) => () // TODO：敌人攻击己方召唤的敌人
        Copper(copper) => {
          let result = copper.apply_attack(enemy.enemy_base.attack)
          if result {
            battle_copper_map.remove(copper.id)
            remove_unit(copper.id)
            map.remove_occupant(copper.position)
          }
        }
      }
    } else {
      let target = enemy.find_nearest_attack_target(map)
      println("target: " + target.to_json().stringify())
      if target is Some(target) {
        let target_position = target.get_position_from_can_attack_target()
        let path_finder_map = PathFinderMap::new(map)
        let next_position = PathFinderMap::get_next_step(
          path_finder_map,
          enemy.position,
          target_position,
          enemy.enemy_base.move_range,
        )
        if next_position is Some(next_position) {
          println("next_position: " + next_position.to_json().stringify())
          animate_move(enemy.id)
          move_to(enemy.id, next_position)
          enemy.position = next_position
          map.remove_occupant(enemy.position)
          map.add_occupant(enemy.position, Occupant::Enemy(enemy))
        }
      }
    }
  }
  animate_reset()
}
