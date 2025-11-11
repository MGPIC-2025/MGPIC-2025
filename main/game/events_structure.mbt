///|
/// 前端：当结构被点击
/// 后端：返回结构信息以供渲染信息栏
fn handle_on_click_structure(id : Int) -> Unit {
  let structure = get_structure_by_id(id)
  msg_info.broadcast({
    type_msg: "handle_on_click_structure",
    content: ({ "structure": structure.to_json() } : Json).stringify(),
  })
}

///|
/// 前端：当建筑开始攻击
/// 搜索可攻击的目标并且设置可攻击状态地块
fn handle_on_structure_attack_start(map : Map_, id : Int) -> Unit {
  handle_on_move_end()
  handle_on_attack_end()
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
        global.val.bag.add_resource(enemy.get_drop_items())
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
        if battle_copper_map.length() == 0 {
          game_over()
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
    Structure(structure_) => {
      let result = structure_.apply_attack(
        structure.structure_base.attribute.attack,
      )
      if result {
        structure_map.remove(structure_.id)
        remove_unit(structure_.id)
        map.remove_occupant(structure_.position)
      } else {
        // 更新建筑血量显示
        update_health(
          structure_.id,
          structure_.now_health,
          structure_.structure_base.health,
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
