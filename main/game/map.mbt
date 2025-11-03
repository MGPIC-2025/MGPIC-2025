///|
/// Todo: 掉落物的 Occupant 还没写，这个我感觉可以单独搞一套逻辑，到时候再说吧
enum Occupant {
  Enemy(Enemy)
  Copper(BattleCopper)
  Structure(@structure.Structure)
  ChargingCoil
  Empty
}

///|
struct MapBlock {
  mut occupant : Occupant
  resources : Array[Item]
}

///|
pub fn MapBlock::new() -> MapBlock {
  { occupant: Empty, resources: [] }
}

///|
struct Map_ {
  rooms : Array[Room]
}

///|
fn Map_::new(escape_set : Set[(Int, Int)]) -> Map_ {
  let room = Room::new(1, (0, 0), escape_set)
  let map = Map_::{ rooms: [] }
  Map_::add_room(map, room)
  map
}

///|
fn Map_::is_occupy(map : Map_, position : (Int, Int)) -> Bool {
  let room = Map_::find_position_in_map(map, position)
  if room is Some(room) {
    guard map.global_position_to_room_position(position) is Some((_, position))
    return !(room.blocks[position.0][position.1].occupant is Empty)
  }
  false
}

///|
fn Map_::force_get_room_position(
  map : Map_,
  position : (Int, Int),
) -> (Room, (Int, Int)) {
  let room = Map_::find_position_in_map(map, position)
  guard room is Some(room)
  guard map.global_position_to_room_position(position) is Some((_, position))
  return (room, position)
}

///|
fn Map_::get_occupant(map : Map_, position : (Int, Int)) -> Occupant {
  let (room, position) = Map_::force_get_room_position(map, position)
  return room.blocks[position.0][position.1].occupant
}

///|
fn Map_::remove_occupant(map : Map_, position : (Int, Int)) -> Unit {
  let (room, position) = Map_::force_get_room_position(map, position)
  room.blocks[position.0][position.1].occupant = Empty
}

///|
fn Map_::add_occupant(
  map : Map_,
  position : (Int, Int),
  occupant : Occupant,
) -> Unit {
  let (room, position) = Map_::force_get_room_position(map, position)
  room.blocks[position.0][position.1].occupant = occupant
}

///|
fn Map_::find_position_in_map(map : Map_, position : (Int, Int)) -> Room? {
  for room in map.rooms {
    if Room::is_coord_in_room(room, position) {
      return Some(room)
    }
  }
  None
}

///|
fn Map_::global_position_to_room_position(
  map : Map_,
  position : (Int, Int),
) -> (Room, (Int, Int))? {
  for room in map.rooms {
    if Room::is_coord_in_room(room, position) {
      // 转换为房间内的本地坐标
      let local_x = position.0 - room.index_position.0
      let local_y = position.1 - room.index_position.1
      return Some((room, (local_x, local_y)))
    }
  }
  None
}

///|
pub fn broadcast_room_content(room : Room) -> Unit {
  let (room_x, room_y) = room.index_position

  // 优化：批量发送地图块，避免256条单独消息造成卡顿
  put_room_blocks(room.index_position, 16)

  // 只发送有内容的格子（敌人、铜偶、矿物、建筑等）
  for x in 0..<16 {
    for y in 0..<16 {
      let global_pos = (room_x + x, room_y + y)
      let occupant = room.blocks[x][y].occupant
      if occupant is Enemy(enemy) {
        set_enemy(enemy, enemy.id, global_pos)
        // 显示敌人血条
        update_health(enemy.id, enemy.now_health, enemy.enemy_base.health)
      } else if occupant is Copper(copper) {
        set_copper(copper, copper.id, global_pos)
        // 显示铜偶血条
        update_health(copper.id, copper.now_health, copper.copper.attribute.health)
      } else if occupant is Structure(structure) {
        set_structure(structure, structure.id(), global_pos)
      } else if occupant is ChargingCoil {
        // ChargingCoil 是充能线圈，作为特殊标记（中心点的怪物生成器）
        // 暂时不渲染，或者可以渲染一个特殊的建筑模型
        // TODO: 可以添加 set_charging_coil(global_pos) 如果需要渲染
      }

      // 如果该格子有地面资源，发送资源标记
      if room.blocks[x][y].resources.length() > 0 {
        put_resource_marker(global_pos)
      }
    }
  }
}

///|
fn Map_::add_room(map : Map_, room : Room) -> Unit {
  map.rooms.push(room)
  broadcast_room_content(room)
}

///|
fn Map_::add_resource(
  map : Map_,
  position : (Int, Int),
  resource : Item,
) -> Unit {
  if resource.item_type is Resource(_) {
    let (room, position) = Map_::force_get_room_position(map, position)
    for i in 0..<room.blocks[position.0][position.1].resources.length() {
      if room.blocks[position.0][position.1].resources[i].item_type ==
        resource.item_type {
        room.blocks[position.0][position.1].resources[i].count += resource.count
        return
      }
    }
    room.blocks[position.0][position.1].resources.push(resource)
  }
}

///|
fn Map_::get_global_map(map : Map_) -> Map[(Int, Int), MapBlock] {
  let result = {}
  for room in map.rooms {
    let (room_x, room_y) = room.index_position
    for x in 0..<16 {
      for y in 0..<16 {
        let global_pos = (room_x + x, room_y + y)
        result[global_pos] = room.blocks[x][y]
      }
    }
  }
  result
}
