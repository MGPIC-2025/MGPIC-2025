///|
let structure_map : Map[Int, Structure] = {}

///|
priv struct Structure {
  id : Int
  owned : Bool // 是否是玩家建造的结构
  mut position : (Int, Int)
  mut storage : Item?
  mut can_move : Bool // 是否可以移动
  mut can_attack : Bool // 是否可以攻击
  // 如果是心源矿钻，则需要记录资源类型
  resource_type : @resource.ResourceType?
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
  has_storage : Bool
  attack_range : Int
  description : String
  asset_url : String
  model_url : String
  attribute : @attribute.Attribute
  cost : @resource.ResourceCost
} derive(ToJson)

///|
fn Structure::new(
  structure_base : StructureBase,
  owned~ : Bool,
  resource_type~ : @resource.ResourceType?,
  position : (Int, Int),
) -> Structure {
  let structure = {
    id: @id.id_pool.get_id(),
    owned,
    position,
    storage: None,
    can_move: structure_base.can_move,
    can_attack: structure_base.can_attack,
    resource_type,
    now_health: structure_base.health,
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
          Enemy(enemy) if enemy.owned == true =>
            can_attack.push(CanAttackTarget::Enemy(enemy))
          Structure(structure) if structure.owned == true =>
            can_attack.push(CanAttackTarget::Structure(structure))
          _ => ()
        }
      } else {
        match occupant {
          Copper(copper) => can_attack.push(CanAttackTarget::Copper(copper))
          Enemy(enemy) if enemy.owned == false =>
            can_attack.push(CanAttackTarget::Enemy(enemy))
          Structure(structure) if structure.owned == false =>
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

///|
fn Structure::get_can_move(
  structure : Structure,
  map : Map_,
) -> Array[(Int, Int)] {
  let can_move = []
  let offset = generate_offset(5)
  for offset_ in offset {
    let position = (
      structure.position.0 + offset_.0,
      structure.position.1 + offset_.1,
    )
    if !map.is_occupy_or_out_of_map(position) {
      can_move.push(position)
    }
  }
  can_move
}

///|
fn Structure::get_can_extract(
  structure : Structure,
  map : Map_,
) -> Array[(Int, Int)] {
  let can_extract = []
  let offset = generate_offset(5)
  for offset_ in offset {
    let position = (
      structure.position.0 + offset_.0,
      structure.position.1 + offset_.1,
    )
    let self_item = structure.storage
    if map.is_occupy(position) {
      if map.get_occupant(position) is Structure(structure) &&
        structure.owned == false &&
        structure.storage is Some(item) &&
        item.item_type is Resource(resource_type) &&
        item.count > 0 &&
        (
          self_item is None ||
          (
            self_item is Some(self_item) &&
            self_item.item_type is Resource(self_resource_type) &&
            self_resource_type == resource_type
          )
        ) {
        can_extract.push(position)
      }
    }
  }
  can_extract
}

///|
fn Structure::get_transfer_position(
  structure : Structure,
  item : Item,
  map : Map_,
) -> Array[(Int, Int)] {
  let result = []
  let offset = [
    (-1, 0),
    (1, 0),
    (0, -1),
    (0, 1),
    (-1, -1),
    (-1, 1),
    (1, -1),
    (1, 1),
  ]
  for offset_ in offset {
    let position = (
      structure.position.0 + offset_.0,
      structure.position.1 + offset_.1,
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
