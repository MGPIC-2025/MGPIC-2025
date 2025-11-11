///|
let structure_map : Map[Int, Structure] = {}

///|
priv struct Structure {
  id : Int
  owned : Bool // 是否是玩家建造的结构
  position : (Int, Int)
  mut can_attack : Bool // 是否可以攻击
  // 如果是心源矿钻，则需要记录资源类型
  resource_type : ResourceType?
  mut now_health : Float
  structure_base : StructureBase
} derive(ToJson)

///|
struct StructureBase {
  name : String
  health : Float
  // 是否可以攻击，只有玩家建造出的可攻击结构可以攻击
  can_move : Bool
  can_attack : Bool
  attack_range : Int
  description : String
  asset_url : String
  model_url : String
  attribute : Attribute
  cost : ResourceCost
} derive(ToJson)

///|
fn Structure::new(
  structure_base : StructureBase,
  owned~ : Bool,
  resource_type~ : ResourceType?,
  position : (Int, Int),
) -> Structure {
  let structure = {
    id: id_pool.get_id(),
    owned,
    position,
    can_attack: structure_base.can_attack,
    now_health: structure_base.health,
    resource_type,
    structure_base,
  }
  structure_map.set(structure.id, structure)
  structure
}

///|
fn get_structure_by_id(id : Int) -> Structure {
  structure_map.get(id).unwrap()
}

///|
fn Structure::update_move_and_attack_and_summon_status(
  structure : Structure,
) -> Unit {
  clear_state(structure.id)
  if structure.structure_base.can_attack {
    display_can_attack(structure.id, true)
  }
}

///|
fn Structure::get_attack_targets(
  structure : Structure,
  map : Map_,
) -> Array[CanAttackTarget] {
  let attack_range = structure.structure_base.attack_range
  let offset = generate_offset(attack_range)
  let can_attack = []
  for offset_ in offset {
    let position = (
      structure.position.0 + offset_.0,
      structure.position.1 + offset_.1,
    )
    if map.is_occupy(position) {
      let occupant = map.get_occupant(position)
      if structure.owned {
        match occupant {
          Copper(copper) if structure.structure_base.name == "维修工坊" =>
            can_attack.push(CanAttackTarget::Copper(copper))
          Enemy(enemy) if enemy.owned == false =>
            can_attack.push(CanAttackTarget::Enemy(enemy))
          Structure(structure) if structure.owned == false =>
            can_attack.push(CanAttackTarget::Structure(structure))
          _ => ()
        }
      } else {
        match occupant {
          Copper(copper) => can_attack.push(CanAttackTarget::Copper(copper))
          Enemy(enemy) if enemy.owned == true =>
            can_attack.push(CanAttackTarget::Enemy(enemy))
          Structure(structure) if structure.owned == true =>
            can_attack.push(CanAttackTarget::Structure(structure))
          _ => ()
        }
      }
    }
  }
  can_attack
}

///|
fn Structure::apply_attack(structure : Structure, attack : Float) -> Bool {
  structure.now_health -= attack
  return structure.now_health <= 0
}
