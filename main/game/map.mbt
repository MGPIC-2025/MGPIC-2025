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
  rooms : Array[Array[Room]]
}
