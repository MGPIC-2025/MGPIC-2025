///|
/// 前端：当敌人被点击
/// 后端：返回敌人信息以供渲染信息栏
/// 注意：这里的资源是地图块上的资源，不是敌人背包里的资源
fn handle_on_click_enemy(id : Int) -> Unit {
  // 清除所有范围显示（切换敌人时）
  handle_on_move_end()
  handle_on_attack_end()
  handle_on_transfer_end()
  handle_on_summon_end()
  let enemy = enemy_map.get(id).unwrap()
  let position = enemy.position
  let map = force_get_current_map()
  let map_block = map.global_position_to_room_position(position)
  guard map_block is Some((room, position))
  let resource = room.blocks[position.0][position.1].resources
  // 检查是否有攻击目标
  let attack_targets = enemy.get_attack_targets(map)
  let has_attack_targets = attack_targets.length() > 0
  @global_msg.msg_info.broadcast({
    type_msg: "handle_on_click_enemy",
    content: (
      {
        "enemy": enemy.to_json(),
        "resources": resource.to_json(),
        "has_attack_targets": has_attack_targets,
      } : Json).stringify(),
  })
}

///|
/// 前端：当敌人（玩家）开始攻击
/// 搜索可攻击的目标并且设置可攻击状态地块
fn handle_on_enemy_attack_start(map : Map_, id : Int) -> Unit {
  handle_on_move_end()
  handle_on_attack_end()
  handle_on_transfer_end()
  handle_on_summon_end()
  let enemy = enemy_map.get(id).unwrap()
  let attack_target = enemy.get_attack_targets(map)
  for target in attack_target {
    let position = target.get_position_from_can_attack_target()
    set_attack_block(position)
    setted_attack_blocks.add(position)
  }
}

///|
/// 前端：当敌人（玩家）取消攻击
/// 后端：清除可攻击的地块
fn handle_on_enemy_attack_end() -> Unit {
  for position in setted_attack_blocks {
    clear_block(position)
    check_and_reset_block(position, Attack)
  }
  setted_attack_blocks.clear()
}

///|
/// 前端：当敌人（玩家）实施攻击
/// 后端：计算攻击结果
fn handle_on_enemy_attack_apply(
  id : Int,
  position : (Int, Int),
  map : Map_,
) -> Unit {
  if not(setted_attack_blocks.contains(position)) {
    return
  }
  // 移动前将视角聚焦到敌人
  animate_move(id)
  let enemy = enemy_map.get(id).unwrap()
  let target = map.get_occupant(position)
  match target {
    Enemy(target_enemy) => {
      let result = target_enemy.apply_attack(enemy.enemy_base.attack)
      // 单位被击杀
      if result {
        let drop_items = target_enemy.get_drop_items()
        for drop_item in drop_items {
          map.add_resource(target_enemy.position, drop_item)
        }
        // 如果有掉落物，显示资源标记
        if drop_items.length() > 0 {
          put_resource_marker(target_enemy.position)
        }
        enemy_map.remove(target_enemy.id)
        remove_unit(target_enemy.id)
        map.remove_occupant(target_enemy.position)
      } else {
        // 更新敌人血量显示
        update_health(
          target_enemy.id,
          target_enemy.now_health,
          target_enemy.enemy_base.health,
        )
      }
      enemy.can_attack = false
      enemy.update_move_and_attack_and_summon_status()
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
fn handle_on_enemy_move_start(map : Map_, id : Int) -> Unit {
  // 先清除之前的移动范围和攻击范围
  handle_on_move_end()
  handle_on_attack_end()
  handle_on_transfer_end()
  handle_on_summon_end()
  let enemy = enemy_map.get(id).unwrap()
  let can_move = enemy.get_can_move(map)
  for position in can_move {
    set_move_block(position)
    setted_move_blocks.add(position)
  }
}

///|
fn handle_on_enemy_move_end() -> Unit {
  for position in setted_move_blocks {
    clear_block(position)
    check_and_reset_block(position, Move)
  }
  setted_move_blocks.clear()
}

///|
///｜
/// 前端：当敌人（玩家）实施移动
/// 后端：计算移动结果
/// 比较不同的是敌人的移动是不可以出界的
fn handle_on_enemy_move_apply(
  id : Int,
  position : (Int, Int),
  map : Map_,
) -> Unit {
  // 验证移动位置是否在有效范围内
  if not(setted_move_blocks.contains(position)) {
    // 位置无效，保持范围显示，等待玩家重新选择
    return
  }
  // 移动前将视角聚焦到敌人
  animate_move(id)
  let enemy = enemy_map.get(id).unwrap()
  if map.find_position_in_map(position) is Some(_) {
    // 如果仍在当前已有的房间内  
    // 移除旧位置的敌人，并将其放到新位置
    let now_position = enemy.position
    // 将全局坐标转换为房间本地坐标
    let (now_room, now_local_pos) = map
      .global_position_to_room_position(now_position)
      .unwrap()
    let (target_room, target_local_pos) = map
      .global_position_to_room_position(position)
      .unwrap()
    now_room.blocks[now_local_pos.0][now_local_pos.1].occupant = Empty
    target_room.blocks[target_local_pos.0][target_local_pos.1].occupant = Occupant::Enemy(
      enemy,
    )
    // 更新敌人的位置
    enemy.position = position
    // 根据位置改变敌人的朝向
    change_direction(
      id,
      convert_direction_to_unit_direction(
        get_direction_by_position(now_position, position),
      ),
    )
    // 移动敌人到新位置
    move_to(id, position)
  } else {
    abort("enemy move to out of map")
  }
  enemy.can_move = false
  enemy.update_move_and_attack_and_summon_status()
  for position in setted_move_blocks {
    clear_block(position)
    check_and_reset_block(position, Move)
  }
  setted_move_blocks.clear()
}
