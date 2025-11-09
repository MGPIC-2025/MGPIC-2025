///|
/// 前端：当结构被点击
/// 后端：返回结构信息以供渲染信息栏
/// 注意：这里的资源是地图块上的资源，不是结构背包里的资源
fn handle_on_click_structure(id : Int) -> Unit {
  let structure = get_structure_by_id(id)
  let position = structure.position
  let map = force_get_current_map()
  let map_block = map.global_position_to_room_position(position)
  guard map_block is Some((room, position))
  let resource = room.blocks[position.0][position.1].resources
  @global_msg.msg_info.broadcast({
    type_msg: "handle_on_click_structure",
    content: (
      { "structure": structure.to_json(), "resources": resource.to_json() } :
      Json).stringify(),
  })
}

///|
/// 前端：当建筑开始攻击
/// 搜索可攻击的目标并且设置可攻击状态地块
fn handle_on_structure_attack_start(map : Map_, id : Int) -> Unit {
  handle_on_move_end()
  handle_on_attack_end()
  handle_on_transfer_end()
  handle_on_summon_end()
  let structure = get_structure_by_id(id)
  let attack_target = structure.get_attack_targets(map)
  for target in attack_target {
    let position = target.get_position_from_can_attack_target()
    set_attack_block(position)
    setted_attack_blocks.add(position)
  }
}

///|
/// 前端：当建筑取消或结束攻击
/// 后端：清除可攻击的地块
fn handle_on_structure_attack_end() -> Unit {
  for position in setted_attack_blocks {
    clear_block(position)
    check_and_reset_block(position, Attack)
  }
  setted_attack_blocks.clear()
}

///|
/// 前端：当建筑实施攻击
/// 后端：计算攻击结果
fn handle_on_structure_attack_apply(
  id : Int,
  position : (Int, Int),
  map : Map_,
) -> Unit {
  // 攻击前将视角聚焦到建筑
  animate_move(id)
  let structure = get_structure_by_id(id)
  let target = map.get_occupant(position)
  match target {
    Enemy(enemy) => {
      let result = enemy.apply_attack(structure.structure_base.attribute.attack)
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
      structure.can_attack = false
      structure.update_move_and_attack_and_summon_status()
    }
    Copper(copper) => {
      if structure.owned {
        copper.apply_mechanic_heal(structure.structure_base.attribute.attack)
      } else {
        let result = copper.apply_attack(
          structure.structure_base.attribute.attack,
        )
        if result {
          battle_copper_map.remove(copper.id)
          remove_unit(copper.id)
          map.remove_occupant(copper.position)
        }
      }
      // 更新铜偶血量显示
      update_health(
        copper.id,
        copper.now_health,
        copper.copper.attribute.health,
      )
      structure.can_attack = false
      structure.update_move_and_attack_and_summon_status()
    }
    Structure(structure) => {
      let result = structure.apply_attack(
        structure.structure_base.attribute.attack,
      )
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
      structure.can_attack = false
      structure.update_move_and_attack_and_summon_status()
    }
    Empty => ()
    _ => abort("target is not enemy or copper")
  }
  for position in setted_attack_blocks {
    clear_block(position)
    check_and_reset_block(position, Attack)
  }
  setted_attack_blocks.clear()
  if !(target is Empty) {
    attack_complete(id)
  }
}

///|
/// 前端：当建筑开始移动（只有矿车）
/// 搜索可移动的目标并且设置可移动状态地块
fn handle_on_structure_move_start(map : Map_, id : Int) -> Unit {
  handle_on_move_end()
  handle_on_attack_end()
  handle_on_transfer_end()
  handle_on_summon_end()
  let structure = get_structure_by_id(id)
  let can_move = structure.get_can_move(map)
  for position in can_move {
    set_move_block(position)
    setted_move_blocks.add(position)
  }
}

///|
/// 前端：当建筑取消或结束移动
/// 后端：清除可移动的地块
fn handle_on_structure_move_end() -> Unit {
  for position in setted_move_blocks {
    clear_block(position)
    check_and_reset_block(position, Move)
  }
  setted_move_blocks.clear()
}

///|
/// 前端：当建筑实施移动
/// 后端：计算移动结果
fn handle_on_structure_move_apply(
  id : Int,
  position : (Int, Int),
  map : Map_,
) -> Unit {
  animate_move(id)
  let structure = get_structure_by_id(id)
  if map.find_position_in_map(position) is Some(_) {
    // 如果仍在当前已有的房间内  
    // 移除旧位置的建筑，并将其放到新位置
    let now_position = structure.position
    let (now_room, now_local_pos) = map
      .global_position_to_room_position(now_position)
      .unwrap()
    let (target_room, target_local_pos) = map
      .global_position_to_room_position(position)
      .unwrap()
    now_room.blocks[now_local_pos.0][now_local_pos.1].occupant = Empty
    target_room.blocks[target_local_pos.0][target_local_pos.1].occupant = Structure(
      structure,
    )
    // 更新建筑的位置
    structure.position = position
    // 根据位置改变建筑的朝向
    change_direction(
      id,
      convert_direction_to_unit_direction(
        get_direction_by_position(now_position, position),
      ),
    )
    // 移动建筑到新位置
    move_to(id, position)
  } else {
    abort("structure move to out of map")
  }
  structure.can_move = false
  structure.update_move_and_attack_and_summon_status()
  for position in setted_move_blocks {
    clear_block(position)
    check_and_reset_block(position, Move)
  }
  setted_move_blocks.clear()
}

///|
/// 前端：当建筑开始提取资源（只有矿车）
/// 后端：设置可提取资源的地块
fn handle_on_structure_extract_start(map : Map_, id : Int) -> Unit {
  handle_on_move_end()
  handle_on_attack_end()
  handle_on_transfer_end()
  handle_on_summon_end()
  let structure = get_structure_by_id(id)
  let can_extract = structure.get_can_extract(map)
  for position in can_extract {
    set_attack_block(position)
    setted_attack_blocks.add(position)
  }
}

///|
/// 前端：当建筑实施提取资源
/// 后端：计算提取结果
fn handle_on_structure_extract_apply(
  id : Int,
  position : (Int, Int),
  map : Map_,
) -> Unit {
  let structure = get_structure_by_id(id)
  let target = map.get_occupant(position)
  guard target is Structure(target_structure)
  guard target_structure.storage is Some(item)
  match structure.storage {
    Some(self_item) => self_item.count += item.count
    None => structure.storage = Some(item)
  }
  target_structure.storage = None
}

///|
/// 前端：当建筑取消或结束提取资源
/// 后端：清除可提取资源的地块
fn handle_on_structure_extract_end() -> Unit {
  for position in setted_attack_blocks {
    clear_block(position)
    check_and_reset_block(position, Attack)
  }
  setted_attack_blocks.clear()
}

///|
/// 前端：当建筑开始转移资源（只有矿车）
/// 后端：设置可转移资源的地块
fn handle_on_structure_transfer_start(map : Map_, id : Int) -> Unit {
  handle_on_move_end()
  handle_on_attack_end()
  handle_on_transfer_end()
  handle_on_summon_end()
  let structure = get_structure_by_id(id)
  let can_transfer = structure.get_transfer_position(
    structure.storage.unwrap(),
    map,
  )
  for position in can_transfer {
    set_attack_block(position)
    setted_transfer_blocks.add(position)
  }
}

///|
/// 前端：当建筑实施转移资源
/// 后端：计算转移结果
fn handle_on_structure_transfer_apply(
  id : Int,
  position : (Int, Int),
  map : Map_,
) -> Unit {
  let structure = get_structure_by_id(id)
  let target = map.get_occupant(position)
  guard target is Copper(copper)
  copper.inventory.add_item(structure.storage.unwrap())
  structure.storage = None
}

///|
/// 前端：当建筑取消或结束转移资源
/// 后端：清除可转移资源的地块
fn handle_on_structure_transfer_end() -> Unit {
  for position in setted_transfer_blocks {
    clear_block(position)
    check_and_reset_block(position, Attack)
  }
  setted_transfer_blocks.clear()
}
