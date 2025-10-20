///|
let battle_copper_map : Map[Int, BattleCopper] = Map::new()

///|
struct BattleCopper {
  id : Int
  original_id : Int
  copper : @coppers.Copper
  can_move : Bool // 可移动状态，如果为 false，前端应该不允许点击移动按钮
  can_attack : Bool // 可攻击状态，如果为 false，前端应该不允许点击攻击按钮
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
  let battle_copper = BattleCopper::{
    id: @id.id_pool.get_id(),
    copper,
    original_id,
    can_move: true,
    can_attack: true,
    position,
    now_health: copper.attribute.health,
    attribute: copper.attribute,
    inventory: Inventory::new(5),
  }
  battle_copper_map.set(battle_copper.id, battle_copper)
  battle_copper
}

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
fn BattleCopper::get_attack_range(battle_copper : BattleCopper) -> Int {
  match battle_copper.copper.copper_type {
    IronWall => 1
    Arcanist => 3
    Mechanic => 1
    Resonator | CraftsMan => 0  //  无攻击能力的单位返回0（会生成空攻击范围）
  }
}

///|
fn generate_offset(attack_range : Int) -> Array[(Int, Int)] {
  let offset = []
  for i in -attack_range..=attack_range {
    for j in -attack_range..=attack_range {
      if i != 0 || j != 0 {
        offset.push((i, j))
      }
    }
  }
  offset
}

///|
fn BattleCopper::get_can_attack(
  battle_copper : BattleCopper,
  map : Map_,
) -> Array[Enemy] {
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
      if occupant is Enemy(enemy) {
        can_attack.push(enemy)
      }
    }
  }
  can_attack
}

///|
fn BattleCopper::attack(
  battle_copper : BattleCopper,
  map : Map_,
  enemy : Enemy,
  target_position : (Int, Int),
) -> Unit {
  let result = enemy.apply_attack(battle_copper.attribute.attack)
  if result {
    remove_unit(enemy.id)
    map.remove_occupant(target_position)
  }
}

///|
fn BattleCopper::get_can_move(
  battle_copper : BattleCopper,
  map : Map_,
) -> Array[(Int, Int)] {
  let offset = [(-1, 0), (1, 0), (0, -1), (0, 1)]
  let can_move = []
  for offset_ in offset {
    let position = (
      battle_copper.position.0 + offset_.0,
      battle_copper.position.1 + offset_.1,
    )
    if !map.is_occupy(position) {
      can_move.push(position)
    }
  }
  can_move
}

///|
fn BattleCopper::move(
  battle_copper : BattleCopper,
  map : Map_,
  target_position : (Int, Int),
) -> Unit {
  move_to(battle_copper.id, target_position)
  battle_copper.position = target_position
}
