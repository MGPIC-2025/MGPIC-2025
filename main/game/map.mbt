///|
/// Todo: 掉落物的 Occupant 还没写，这个我感觉可以单独搞一套逻辑，到时候再说吧
enum Occupant {
  Enemy(Enemy)
  Copper(BattleCopper)
  Material(Material)
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
  let rooms = [Room::new(1, (0, 0), escape_set)]
  { rooms, }
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
      return Some((room, position))
    }
  }
  None
}
