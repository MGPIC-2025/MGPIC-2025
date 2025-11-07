///|
/// 前端：当游戏开始，注意玩家需要选择三个铜偶加入游戏，这个界面由 @fgeygfe 来做，就是给一个界面从铜偶仓库里面选出来三个，然后给出他们的 id 就好
/// 后端：根据 id 生成铜偶，并将其加入游戏，放置铜偶在地图的开始位置，设置铜偶的朝向为朝向前方
fn handle_on_game_start(ids : Array[Int]) -> Unit {
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

  // 重新广播房间内容（包括地图块、敌人和铜偶）
  // 前端的"已存在检查"会跳过重复的敌人，只创建新的铜偶
  broadcast_room_content(first_room)
  change_direction(copper_1.id, PositiveY)
  change_direction(copper_2.id, PositiveY)
  change_direction(copper_3.id, PositiveY)

  // 显示铜偶的初始状态圈（绿圈和红圈）
  copper_1.update_move_and_attack_and_summon_status()
  copper_2.update_move_and_attack_and_summon_status()
  copper_3.update_move_and_attack_and_summon_status()
}

///|
/// 前端：当游戏回合结束
/// 后端：清除可攻击和可移动的地块，并恢复铜偶的可移动和可攻击状态
fn handle_game_round_pass() -> Unit {
  reset_all_blocks()
  reset_states()
  enemy_ai()
  animate_reset()
}

///|
/// 重新设置所有地砖状态
fn reset_all_blocks() -> Unit {
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
  for summon_block in setted_can_summon_blocks {
    clear_block(summon_block)
  }
  setted_can_summon_blocks.clear()
}

///|
fn reset_states() -> Unit {
  // 恢复铜偶状态
  for battle_copper in battle_copper_map.values() {
    battle_copper.can_move = true
    // 根据铜偶类型设置攻击能力：工匠和共鸣者不能攻击
    battle_copper.can_attack = match battle_copper.copper.copper_type {
      CraftsMan | Resonator => false
      _ => true
    }
    battle_copper.can_summon = match battle_copper.copper.copper_type {
      Resonator => true
      _ => false
    }
    battle_copper.update_move_and_attack_and_summon_status()
  }

  // 恢复友方召唤物状态
  for enemy in enemy_map.values() {
    if enemy.owned {
      enemy.can_move = true
      enemy.can_attack = true
      enemy.update_move_and_attack_and_summon_status()
    }
  }
}

///|
fn enemy_ai() -> Unit {
  let map = force_get_current_map()
  // 野生敌人AI：寻找攻击目标和移动（友方召唤物由玩家控制，不执行AI）
  let enemys = enemy_map.values().iter().filter(enemy => enemy.owned == false)
  for enemy in enemys {
    // 跳过友方召唤物（由玩家控制）
    let attack_targets = enemy.get_attack_targets(map)
    // 如果攻击范围内有可以攻击的目标，则直接开始攻击
    if attack_targets.length() > 0 {
      let attack_target = attack_targets[0]
      animate_move(enemy.id)
      match attack_target {
        Enemy(target_enemy) => {
          // 野生敌人攻击友方召唤物
          let result = target_enemy.apply_attack(enemy.enemy_base.attack)
          if result {
            enemy_map.remove(target_enemy.id)
            remove_unit(target_enemy.id)
            map.remove_occupant(target_enemy.position)
          } else {
            // 更新友方召唤物血量显示
            update_health(
              target_enemy.id,
              target_enemy.now_health,
              target_enemy.enemy_base.health,
            )
          }
        }
        Copper(copper) => {
          let result = copper.apply_attack(enemy.enemy_base.attack)
          if result {
            battle_copper_map.remove(copper.id)
            remove_unit(copper.id)
            map.remove_occupant(copper.position)
          } else {
            // 更新铜偶血量显示
            update_health(
              copper.id,
              copper.now_health,
              copper.copper.attribute.health,
            )
          }
        }
      }
    } else {
      let target = enemy.find_nearest_attack_target()
      if target is Some(target) {
        let target_position = target.get_position_from_can_attack_target()
        let path_finder_map = PathFinderMap::new(map)
        let next_position = PathFinderMap::get_next_step(
          path_finder_map,
          enemy.position,
          target_position,
          enemy.enemy_base.move_range,
          enemy.enemy_base.attack_range,
        )
        if next_position is Some(next_position) {
          animate_move(enemy.id)
          // 根据位置改变敌人的朝向
          change_direction(
            enemy.id,
            convert_direction_to_unit_direction(
              get_direction_by_position(enemy.position, next_position),
            ),
          )
          move_to(enemy.id, next_position)
          map.remove_occupant(enemy.position)
          enemy.position = next_position
          map.add_occupant(enemy.position, Occupant::Enemy(enemy))
        }
      }
    }
  }
}
