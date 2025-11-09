///|
let battle_copper_map : Map[Int, BattleCopper] = Map::new()

///|
priv struct BattleCopper {
  id : Int
  original_id : Int
  copper : @coppers.Copper
  mut can_move : Bool // 可移动状态，如果为 false，前端应该不允许点击移动按钮
  mut can_attack : Bool // 可攻击状态，如果为 false，前端应该不允许点击攻击按钮
  mut can_summon : Bool // 可召唤状态，如果为 false，前端应该不允许点击召唤按钮
  mut position : (Int, Int)
  mut now_health : Float
  attribute : @attribute.Attribute
  inventory : Inventory
} derive(ToJson)

///|
fn get_battle_copper_by_id(id : Int) -> BattleCopper {
  battle_copper_map.get(id).unwrap()
}

///|
fn BattleCopper::new(
  copper : @coppers.Copper,
  original_id : Int,
  position : (Int, Int),
) -> BattleCopper {
  // 根据铜偶类型设置攻击能力：工匠和共鸣者不能攻击
  let can_attack = match copper.copper_type {
    CraftsMan | Resonator => false
    _ => true
  }
  let inventory = Inventory::new(5)
  // 给铜偶初始背包添加一些心源火花用于召唤
  inventory.add_item(Item::new(Resource(@resource.SpiritalSpark), count=5))
  let battle_copper = BattleCopper::{
    id: @id.id_pool.get_id(),
    copper,
    original_id,
    can_move: true,
    can_attack,
    can_summon: copper.copper_type is Resonator,
    position,
    now_health: copper.attribute.health,
    attribute: copper.attribute,
    inventory,
  }
  battle_copper_map.set(battle_copper.id, battle_copper)
  battle_copper
}

///|
// 召唤物现在使用 Enemy 实体而非 BattleCopper

///|
fn BattleCopper::apply_attack(
  battle_copper : BattleCopper,
  attack : Float,
) -> Bool {
  let attack = attack - battle_copper.attribute.defense
  if attack > 0 {
    if @rand.check_probability(battle_copper.attribute.dodge.to_double() / 100) {
      return false
    }
    battle_copper.now_health -= attack
    if battle_copper.now_health <= 0 {
      return true
    }
  }
  false
}

///|
fn BattleCopper::apply_mechanic_heal(
  battle_copper : BattleCopper,
  attack : Float,
) -> Unit {
  battle_copper.now_health += attack
  if battle_copper.now_health > battle_copper.attribute.health {
    battle_copper.now_health = battle_copper.attribute.health
  }
}

///|
fn BattleCopper::get_attack_range(battle_copper : BattleCopper) -> Int {
  // 优先使用 copper_info 中的自定义攻击范围（用于召唤物）
  match battle_copper.copper.copper_info.attack_range {
    Some(range) => range
    None =>
      match battle_copper.copper.copper_type {
        IronWall => 1
        Arcanist => 3
        Mechanic => 1
        Resonator | CraftsMan => 0 // 无攻击能力的单位返回0（会生成空攻击范围）
      }
  }
}

///|
fn BattleCopper::get_can_attack(
  battle_copper : BattleCopper,
  map : Map_,
) -> Array[CanAttackTarget] {
  let attack_range = battle_copper.get_attack_range()
  let offset = generate_offset(attack_range)
  let can_attack = []
  for offset_ in offset {
    let position = (
      battle_copper.position.0 + offset_.0,
      battle_copper.position.1 + offset_.1,
    )
    if map.is_occupy(position) {
      let occupant = map.get_occupant(position)
      match occupant {
        Copper(copper) if copper.copper.copper_type is Mechanic =>
          can_attack.push(CanAttackTarget::Copper(copper))
        Structure(structure) if structure.owned == false =>
          can_attack.push(CanAttackTarget::Structure(structure))
        Enemy(enemy) if enemy.owned == false =>
          can_attack.push(CanAttackTarget::Enemy(enemy))
        _ => ()
      }
    }
  }
  can_attack
}

///|
fn BattleCopper::get_can_move(
  battle_copper : BattleCopper,
  map : Map_,
) -> Array[(Int, Int)] {
  let offset = generate_offset(battle_copper.attribute.speed)
  let can_move = []
  for offset_ in offset {
    let position = (
      battle_copper.position.0 + offset_.0,
      battle_copper.position.1 + offset_.1,
    )
    // 允许：1) 地图内未占用的位置，或 2) 超出地图边界1格的位置（但不允许2格或更多）
    let distance_to_room = map.distance_to_nearest_room(position)
    if distance_to_room <= 1 && !map.is_occupy(position) {
      can_move.push(position)
    }
  }
  can_move
}

///|
fn BattleCopper::get_transfer_position(
  battle_copper : BattleCopper,
  item : Item,
  map : Map_,
) -> Array[(Int, Int)] {
  let result = []
  let offset = [(-1, 0), (1, 0), (0, -1), (0, 1)]
  for offset_ in offset {
    let position = (
      battle_copper.position.0 + offset_.0,
      battle_copper.position.1 + offset_.1,
    )
    if map.is_occupy(position) {
      if map.get_occupant(position) is Copper(copper) {
        if copper.inventory.check_can_add_item(item.item_type) {
          result.push(position)
        }
      }
    }
  }
  result
}

///|
fn BattleCopper::get_summon_position(
  battle_copper : BattleCopper,
  map : Map_,
) -> Array[(Int, Int)] {
  let result = []
  let offset = [(-1, 0), (1, 0), (0, -1), (0, 1)]
  for offset_ in offset {
    let position = (
      battle_copper.position.0 + offset_.0,
      battle_copper.position.1 + offset_.1,
    )
    if !map.is_occupy_or_out_of_map(position) {
      result.push(position)
    }
  }
  result
}

///|
fn BattleCopper::get_structure_build_position(
  battle_copper : BattleCopper,
  map : Map_,
  is_drill~ : Bool,
) -> Array[(Int, Int)] {
  let result = []
  let offset = [(-1, 0), (1, 0), (0, -1), (0, 1)]
  for offset_ in offset {
    let position = (
      battle_copper.position.0 + offset_.0,
      battle_copper.position.1 + offset_.1,
    )
    if is_drill {
      // 矿钻：需要在矿物上建造
      // is_occupy 在超出范围时返回 false，所以是安全的
      if map.is_occupy(position) &&
        map.force_get_map_block(position).occupant is Material(_) {
        result.push(position)
      }
      // 普通建筑：需要空地且没有资源
      // 先用 is_occupy_or_out_of_map 检查是否安全访问
    } else if !map.is_occupy_or_out_of_map(position) &&
      map.force_get_map_block(position).resources.is_empty() {
      result.push(position)
    }
  }
  result
}

///|
fn BattleCopper::transfer(
  battle_copper : BattleCopper,
  to_id : Int,
  item : Item,
) -> Unit {
  let target_copper = get_battle_copper_by_id(to_id)
  battle_copper.inventory.add_item({
    item_type: item.item_type,
    count: -item.count,
  })
  target_copper.inventory.add_item(item)
}

///|
fn BattleCopper::update_move_and_attack_and_summon_status(
  copper : BattleCopper,
) -> Unit {
  clear_state(copper.id)
  // 始终发送状态消息，无论是 true 还是 false,用于修复前端状态显示问题
  display_can_move(copper.id, copper.can_move)
  display_can_attack(copper.id, copper.can_attack)
  display_can_summon(copper.id, copper.can_summon)
}

///|
fn get_battle_copper_list() -> Array[BattleCopper] {
  battle_copper_map.values().to_array()
}
