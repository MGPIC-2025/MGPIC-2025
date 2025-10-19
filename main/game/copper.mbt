///|
struct BattleCopper {
  id : Int
  copper : @coppers.Copper
  can_move : Bool
  can_attack : Bool
  mut now_health : Float
  attribute : @attribute.Attribute
  inventory : Inventory
} derive(ToJson)

///|
fn BattleCopper::new(copper : @coppers.Copper) -> BattleCopper {
  {
    id: @id.id_pool.get_id(),
    copper,
    can_move: true,
    can_attack: true,
    now_health: copper.attribute.health,
    attribute: copper.attribute,
    inventory: Inventory::new(5),
  }
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
    Resonator | CraftsMan => abort("Resonator and CraftsMan can't attack")
  }
}

///|
fn BattleCopper::get_can_move(
  battle_copper : BattleCopper,
  map : Map_,
  now_position : (Int, Int),
) -> Array[(Int, Int)] {
  let offset = [(-1, 0), (1, 0), (0, -1), (0, 1)]
  let can_move = []
  for offset_ in offset {
    let position = (now_position.0 + offset_.0, now_position.1 + offset_.1)
    if !map.is_occupy(position) {
      can_move.push(position)
    }
  }
  can_move
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
  now_position : (Int, Int),
) -> Array[(Int, Int)] {
  let attack_range = battle_copper.get_attack_range()
  let offset = generate_offset(attack_range)
  let can_attack = []
  for offset_ in offset {
    let position = (now_position.0 + offset_.0, now_position.1 + offset_.1)
    if map.is_occupy(position) && map.get_occupant(position) is Enemy(_) {
      can_attack.push(position)
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
fn BattleCopper::move(
  battle_copper : BattleCopper,
  map : Map_,
  target_position : (Int, Int),
) -> Unit {
  move_to(battle_copper.id, target_position)
}
