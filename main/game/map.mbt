///|
enum Occupant {
  Enemy(Enemy)
  Copper(Copper)
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
