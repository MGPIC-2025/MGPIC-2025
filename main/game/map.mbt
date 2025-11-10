///|
priv enum Occupant {
  Enemy(Enemy)
  Copper(BattleCopper)
  Material(Material)
  Structure(Structure)
  Empty
}

///|
struct MapBlock {
  mut occupant : Occupant
}

///|
pub fn MapBlock::new() -> MapBlock {
  { occupant: Empty }
}

///|
priv struct Map_ {
  rooms : Array[Room]
}

///|
fn Map_::new(escape_set : Set[(Int, Int)]) -> Map_ {
  let room = Room::new(1, (0, 0), escape_set)
  let map = Map_::{ rooms: [] }
  // 游戏初始化时不立即广播，等放置铜偶后统一广播
  Map_::add_room_silent(map, room)
  map
}

///|
fn Map_::force_get_map_block(map : Map_, position : (Int, Int)) -> MapBlock {
  let room = Map_::find_position_in_map(map, position)
  guard room is Some(room)
  guard map.global_position_to_room_position(position) is Some((_, position))
  return room.blocks[position.0][position.1]
}

///|
fn Map_::is_occupy_or_out_of_map(map : Map_, position : (Int, Int)) -> Bool {
  let room = Map_::find_position_in_map(map, position)
  if room is Some(room) {
    guard map.global_position_to_room_position(position) is Some((_, position))
    return !(room.blocks[position.0][position.1].occupant is Empty)
  }
  true
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
/// 计算位置到最近房间边界的最短距离
/// 如果位置在房间内，返回 0
/// 如果位置在房间外，返回到最近房间边界的格子数
fn Map_::distance_to_nearest_room(map : Map_, position : (Int, Int)) -> Int {
  // 如果在某个房间内，距离为0
  if Map_::find_position_in_map(map, position) is Some(_) {
    return 0
  }

  // 找到距离最近的房间
  let mut min_distance = 999999
  for room in map.rooms {
    let (room_x, room_y) = room.index_position
    let (x, y) = position

    // 计算到房间边界的最短距离
    let dx = if x < room_x {
      room_x - x
    } else if x >= room_x + 9 {
      x - (room_x + 9) + 1
    } else {
      0
    }
    let dy = if y < room_y {
      room_y - y
    } else if y >= room_y + 9 {
      y - (room_y + 9) + 1
    } else {
      0
    }

    // 使用切比雪夫距离（棋盘距离）
    let distance = if dx > dy { dx } else { dy }
    if distance < min_distance {
      min_distance = distance
    }
  }
  min_distance
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
fn broadcast_room_content(room : Room) -> Unit {
  let (room_x, room_y) = room.index_position

  // 优化：批量发送地图块，避免225条单独消息造成卡顿
  put_room_blocks(room.index_position, 9)

  // 只发送有内容的格子（敌人、铜偶、矿物、建筑等）
  for x in 0..<9 {
    for y in 0..<9 {
      let global_pos = (room_x + x, room_y + y)
      let occupant = room.blocks[x][y].occupant
      match occupant {
        Empty => ()
        Enemy(enemy) => {
          set_enemy(enemy, enemy.id, global_pos)
          // 显示敌人血条
          update_health(enemy.id, enemy.now_health, enemy.enemy_base.health)
        }
        Copper(copper) => {
          set_copper(copper, copper.id, global_pos)
          // 显示铜偶血条
          update_health(
            copper.id,
            copper.now_health,
            copper.copper.attribute.health,
          )
        }
        Structure(structure) =>
          set_structure(structure, structure.id, global_pos)
        Material(material) => set_material(material, material.id, global_pos)
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
/// 添加房间但不立即广播（用于游戏初始化）
fn Map_::add_room_silent(map : Map_, room : Room) -> Unit {
  map.rooms.push(room)
}

///|
fn Map_::get_global_map(map : Map_) -> Map[(Int, Int), MapBlock] {
  let result = {}
  for room in map.rooms {
    let (room_x, room_y) = room.index_position
    for x in 0..<9 {
      for y in 0..<9 {
        let global_pos = (room_x + x, room_y + y)
        result[global_pos] = room.blocks[x][y]
      }
    }
  }
  result
}
