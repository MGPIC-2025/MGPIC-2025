///|
enum Occupant {
  Copper(Copper)
  Material(Material)
  ChargingCoil
  Empty
}

///|
struct MapBlock {
  occupant : Occupant
  resources : Array[Item]
}

///|
struct Room {
  blocks : Array[Array[MapBlock]]
}

///|
struct Map {
  rooms : Array[Array[Room]]
}

